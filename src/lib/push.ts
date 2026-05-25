import { db } from "./db";
import { getWeatherProvider, type WeatherLocation } from "./weather";
import type { WeatherInput } from "./ride-score";

// web-push is loaded lazily so the app still boots if the dependency hasn't
// been installed yet (e.g. fresh checkout before `npm install`). Routes will
// just report "not configured" until it is present.
type WebPushModule = {
  setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  sendNotification(
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string,
    options?: { TTL?: number; urgency?: string }
  ): Promise<unknown>;
};

let webpushLoaded: WebPushModule | null | undefined;
let vapidConfigured = false;

function getWebPush(): WebPushModule | null {
  if (webpushLoaded !== undefined) return webpushLoaded;
  try {
    // eval'd require keeps webpack from trying to resolve this at build time —
    // the dep is optional and may not be installed yet.
    const nodeRequire = eval("require") as NodeRequire;
    const mod = nodeRequire("web-push") as WebPushModule & { default?: WebPushModule };
    webpushLoaded = mod.default ?? mod;
  } catch {
    webpushLoaded = null;
  }
  return webpushLoaded;
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY?.trim() || null;
}

function configureVapid(): WebPushModule | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:alerts@ridebyweather.com";
  if (!publicKey || !privateKey) return null;
  const webpush = getWebPush();
  if (!webpush) return null;
  if (!vapidConfigured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
  }
  return webpush;
}

export interface StormPayload {
  title: string;
  body: string;
  tag: string;
  url: string;
  hoursAway?: number;
  locationName?: string | null;
}

export async function sendPushToSubscription(
  sub: { id: string; endpoint: string; p256dh: string; authKey: string },
  payload: StormPayload
): Promise<{ ok: boolean; statusCode?: number; gone?: boolean }> {
  const webpush = configureVapid();
  if (!webpush) {
    return { ok: false };
  }
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.authKey },
      },
      JSON.stringify(payload),
      { TTL: 3600, urgency: "high" }
    );
    return { ok: true };
  } catch (err: unknown) {
    const e = err as { statusCode?: number };
    const gone = e.statusCode === 404 || e.statusCode === 410;
    return { ok: false, statusCode: e.statusCode, gone };
  }
}

// Returns true if a thunderstorm is happening now or within the look-ahead window.
export function detectStorm(
  current: WeatherInput,
  forecast: { timestamp: Date; weather: WeatherInput }[],
  lookaheadHours = 3
): { active: boolean; hoursAway: number } | null {
  if (current.isStorm || current.condition === "thunderstorm") {
    return { active: true, hoursAway: 0 };
  }
  const cutoff = Date.now() + lookaheadHours * 3600 * 1000;
  for (const h of forecast) {
    if (h.timestamp.getTime() > cutoff) break;
    if (h.weather.isStorm || h.weather.condition === "thunderstorm") {
      const hoursAway = Math.max(
        0,
        Math.round((h.timestamp.getTime() - Date.now()) / 3600 / 1000)
      );
      return { active: true, hoursAway };
    }
  }
  return null;
}

// Don't re-notify the same device within this window unless storm clears and reappears.
const DUPLICATE_SUPPRESSION_MINUTES = 60;

export interface CheckResult {
  checked: number;
  notified: number;
  removed: number;
  errors: number;
}

export async function checkAndNotifyAllSubscribers(): Promise<CheckResult> {
  const result: CheckResult = { checked: 0, notified: 0, removed: 0, errors: 0 };
  if (!configureVapid()) return result;

  const subs = await db.pushSubscription.findMany({
    where: {
      stormAlerts: true,
      lat: { not: null },
      lng: { not: null },
    },
  });

  // Group subscriptions by rounded location so we only fetch weather once per area
  const byLocation = new Map<string, typeof subs>();
  for (const s of subs) {
    const key = `${s.lat!.toFixed(2)}|${s.lng!.toFixed(2)}`;
    const arr = byLocation.get(key) ?? [];
    arr.push(s);
    byLocation.set(key, arr);
  }

  const provider = getWeatherProvider();
  const cutoff = Date.now() - DUPLICATE_SUPPRESSION_MINUTES * 60 * 1000;

  for (const [, group] of byLocation) {
    const first = group[0];
    const loc: WeatherLocation = { lat: first.lat!, lng: first.lng! };

    let storm: ReturnType<typeof detectStorm> = null;
    try {
      const [current, forecast] = await Promise.all([
        provider.getCurrentWeather(loc),
        provider.getHourlyForecast(loc, 6),
      ]);
      storm = detectStorm(current, forecast);
    } catch {
      result.errors += group.length;
      continue;
    }

    result.checked += group.length;
    if (!storm) continue;

    const payload: StormPayload = {
      title: storm.hoursAway === 0 ? "⚡ Thunderstorm now" : `⚡ Storm in ~${storm.hoursAway}h`,
      body:
        storm.hoursAway === 0
          ? `Lightning detected near ${first.locationName ?? "your location"}. Get indoors.`
          : `Thunderstorm expected near ${first.locationName ?? "your location"} in about ${storm.hoursAway} hour${storm.hoursAway === 1 ? "" : "s"}.`,
      tag: `storm-${first.lat!.toFixed(2)}-${first.lng!.toFixed(2)}`,
      url: "/",
      hoursAway: storm.hoursAway,
      locationName: first.locationName,
    };

    for (const s of group) {
      if (s.lastNotifiedAt && s.lastNotifiedAt.getTime() > cutoff) continue;
      const res = await sendPushToSubscription(s, payload);
      if (res.ok) {
        result.notified += 1;
        await db.pushSubscription.update({
          where: { id: s.id },
          data: { lastNotifiedAt: new Date(), failureCount: 0 },
        });
      } else if (res.gone) {
        result.removed += 1;
        await db.pushSubscription.delete({ where: { id: s.id } });
      } else {
        result.errors += 1;
        await db.pushSubscription.update({
          where: { id: s.id },
          data: { failureCount: { increment: 1 } },
        });
      }
    }
  }

  return result;
}
