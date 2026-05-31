import { db } from "./db";
import { getWeatherProvider, type WeatherLocation, type HourlyForecast } from "./weather";
import { computeCyclingScore, type WeatherInput } from "./ride-score";

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

// ---------- Ride Window Alerts ----------
// Daily evening push: "Tomorrow's best ride window is 6-9 AM, score 8.2."
// Uses the same VAPID + subscription infra as storm alerts, but only fires
// for subscribers who opted in via the windowAlerts flag.

export interface BestWindow {
  startHourLocal: number; // 0-23, local to the subscriber's location
  endHourLocal: number;   // exclusive
  avgScore: number;       // 0-10
  scoreLabel: string;
  weather: WeatherInput;  // representative weather (the middle hour)
  startsTomorrow: boolean;
}

// Pull the local hour-of-day out of an Open-Meteo timestamp. Because we ask
// for timezone=auto, the timestamps come back as local strings without an
// offset; Node parses them as UTC. So getUTCHours() actually reads back the
// LOCAL hour at the queried location. Same trick for the day-of-month.
function localHour(ts: Date): number {
  return ts.getUTCHours();
}
function localDay(ts: Date): number {
  return ts.getUTCDate();
}

const DAYLIGHT_START_HOUR = 6;
const DAYLIGHT_END_HOUR = 20; // 8 PM
const WINDOW_LENGTH_HOURS = 2;
const MIN_NOTIFY_SCORE = 6.0; // 6.0 = "GOOD" on the 0-10 scale
const WINDOW_DEDUP_MS = 22 * 3600 * 1000; // once per day

// Find the best contiguous WINDOW_LENGTH_HOURS daylight window in the
// hourly forecast. Prefers tomorrow's daylight if it scores well; falls
// back to later today if tomorrow has no qualifying window.
export function findBestRideWindow(forecast: HourlyForecast[]): BestWindow | null {
  if (forecast.length < WINDOW_LENGTH_HOURS) return null;

  // Day boundary: the first slot we see has some local hour. Tomorrow starts
  // when the day-of-month changes.
  const firstDay = forecast[0] ? localDay(forecast[0].timestamp) : null;

  const eligible = forecast.filter((h) => {
    const hr = localHour(h.timestamp);
    return hr >= DAYLIGHT_START_HOUR && hr < DAYLIGHT_END_HOUR;
  });

  if (eligible.length < WINDOW_LENGTH_HOURS) return null;

  let best: { startIdx: number; avg: number } | null = null;

  for (let i = 0; i + WINDOW_LENGTH_HOURS <= eligible.length; i++) {
    // Skip non-contiguous spans (e.g., the jump from 7pm today to 6am tomorrow).
    const span = eligible.slice(i, i + WINDOW_LENGTH_HOURS);
    const contiguous = span.every((h, j) => {
      if (j === 0) return true;
      const prev = span[j - 1].timestamp.getTime();
      const dt = h.timestamp.getTime() - prev;
      return dt > 3300_000 && dt < 3900_000; // ~1 hour ±10 min
    });
    if (!contiguous) continue;

    const scores = span.map((h) => computeCyclingScore(h.weather).score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (!best || avg > best.avg) best = { startIdx: i, avg };
  }

  if (!best) return null;

  const span = eligible.slice(best.startIdx, best.startIdx + WINDOW_LENGTH_HOURS);
  const mid = span[Math.floor(span.length / 2)];
  const scoreLabel =
    best.avg >= 9.5 ? "PERFECT" :
    best.avg >= 8.0 ? "GREAT" :
    best.avg >= 6.0 ? "GOOD" :
    best.avg >= 5.0 ? "NEUTRAL" : "TOUGH";

  const firstSlot = span[0];
  const lastSlot = span[span.length - 1];

  return {
    startHourLocal: localHour(firstSlot.timestamp),
    endHourLocal: (localHour(lastSlot.timestamp) + 1) % 24,
    avgScore: Math.round(best.avg * 10) / 10,
    scoreLabel,
    weather: mid.weather,
    startsTomorrow: firstDay !== null && localDay(firstSlot.timestamp) !== firstDay,
  };
}

function fmtHour12(h: number): string {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}

function describeConditions(w: WeatherInput): string {
  const temp = `${Math.round(w.tempF)}°F`;
  const wind =
    w.windSpeedMph < 6 ? "calm wind" :
    w.windSpeedMph < 12 ? "light wind" :
    w.windSpeedMph < 20 ? `${Math.round(w.windSpeedMph)} mph wind` :
    `${Math.round(w.windSpeedMph)} mph wind`;
  const sky =
    w.condition === "clear" ? "sunny" :
    w.condition === "clouds" ? "cloudy" :
    w.condition === "rain" ? "rainy" :
    w.condition;
  return `${temp}, ${wind}, ${sky}`;
}

export async function checkAndNotifyBestWindows(): Promise<CheckResult> {
  const result: CheckResult = { checked: 0, notified: 0, removed: 0, errors: 0 };
  if (!configureVapid()) return result;

  const subs = await db.pushSubscription.findMany({
    where: {
      windowAlerts: true,
      lat: { not: null },
      lng: { not: null },
    },
  });

  // Group by rounded lat/lng so we only call the weather API once per region.
  const byLocation = new Map<string, typeof subs>();
  for (const s of subs) {
    const key = `${s.lat!.toFixed(2)}|${s.lng!.toFixed(2)}`;
    const arr = byLocation.get(key) ?? [];
    arr.push(s);
    byLocation.set(key, arr);
  }

  const provider = getWeatherProvider();
  const cutoff = Date.now() - WINDOW_DEDUP_MS;

  for (const [, group] of byLocation) {
    const first = group[0];
    const loc: WeatherLocation = { lat: first.lat!, lng: first.lng! };

    let window: BestWindow | null = null;
    try {
      // 36 hours covers tonight + all of tomorrow's daylight even if the cron
      // runs around midnight local time.
      const forecast = await provider.getHourlyForecast(loc, 36);
      window = findBestRideWindow(forecast);
    } catch {
      result.errors += group.length;
      continue;
    }

    result.checked += group.length;
    if (!window || window.avgScore < MIN_NOTIFY_SCORE) continue;

    const day = window.startsTomorrow ? "Tomorrow" : "Today";
    const timeRange = `${fmtHour12(window.startHourLocal)}–${fmtHour12(window.endHourLocal)}`;
    const place = first.locationName ?? "your area";

    const payload: StormPayload = {
      title: `🚴 ${window.scoreLabel} window: ${day} ${timeRange}`,
      body: `${place}: Ride Score ${window.avgScore.toFixed(1)} — ${describeConditions(window.weather)}.`,
      tag: `window-${first.lat!.toFixed(2)}-${first.lng!.toFixed(2)}`,
      url: "/cycling",
      locationName: first.locationName,
    };

    for (const s of group) {
      if (s.lastWindowNotifiedAt && s.lastWindowNotifiedAt.getTime() > cutoff) continue;
      const res = await sendPushToSubscription(s, payload);
      if (res.ok) {
        result.notified += 1;
        await db.pushSubscription.update({
          where: { id: s.id },
          data: { lastWindowNotifiedAt: new Date(), failureCount: 0 },
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

// Pre-sunset light-battery reminder.
//
// Fires once per location-group at (local sunset − duskOffsetMin).
// Local time is derived from the location's UTC offset, which Open-Meteo
// supplies via timezone=auto in the daily forecast.
export async function checkAndNotifyDusk(now: Date = new Date()): Promise<CheckResult> {
  const result: CheckResult = { checked: 0, notified: 0, removed: 0, errors: 0 };
  if (!configureVapid()) return result;

  // Cast until prisma generate picks up the new duskAlerts column — Vercel
  // regens during `prisma db push` on deploy.
  const subs = (await db.pushSubscription.findMany({
    where: {
      duskAlerts: true,
      lat: { not: null },
      lng: { not: null },
    } as never,
  })) as Array<Awaited<ReturnType<typeof db.pushSubscription.findFirst>> & {
    duskOffsetMin?: number | null;
    lastDuskNotifiedAt?: Date | null;
  }>;

  // Group by rounded location so we only fetch daily forecast once per area.
  const byLocation = new Map<string, typeof subs>();
  for (const s of subs) {
    const key = `${s.lat!.toFixed(2)}|${s.lng!.toFixed(2)}`;
    const arr = byLocation.get(key) ?? [];
    arr.push(s);
    byLocation.set(key, arr);
  }

  const provider = getWeatherProvider();
  // Don't refire within 18h so a cron that runs every hour can't double up.
  const dedupCutoff = now.getTime() - 18 * 3600 * 1000;

  for (const [, group] of byLocation) {
    const first = group[0];
    const loc: WeatherLocation = { lat: first.lat!, lng: first.lng! };

    let sunsetIso: string | null = null;
    try {
      const daily = await provider.getDailyForecast(loc, 1);
      sunsetIso = daily[0]?.sunset ?? null;
    } catch {
      result.errors += group.length;
      continue;
    }
    if (!sunsetIso) {
      result.checked += group.length;
      continue;
    }

    // Open-Meteo returns local-time ISO without tz suffix (e.g. "2026-05-28T20:14").
    // We parse the clock portion as local time at the location.
    const t = sunsetIso.split("T")[1];
    if (!t) continue;
    const [hh, mm] = t.split(":").map(Number);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) continue;
    const sunsetMinOfDay = hh * 60 + mm;

    // Convert "now" to the location's local time by subtracting its longitude
    // offset. Using longitude / 15 = hours is rough but good enough for a
    // ±30-min cron window. Cron runs hourly, so we only need to match the hour.
    const nowUtcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
    const offsetHours = Math.round(first.lng! / 15);
    const nowLocalMin = ((nowUtcMin + offsetHours * 60) % 1440 + 1440) % 1440;

    result.checked += group.length;

    for (const s of group) {
      const offsetMin = s.duskOffsetMin ?? 30;
      const targetMin = (sunsetMinOfDay - offsetMin + 1440) % 1440;
      // Fire if within ±30 min of target so an hourly cron catches it.
      let diff = Math.abs(nowLocalMin - targetMin);
      if (diff > 720) diff = 1440 - diff;
      if (diff > 30) continue;
      if (s.lastDuskNotifiedAt && s.lastDuskNotifiedAt.getTime() > dedupCutoff) continue;

      const payload: StormPayload = {
        title: "🔦 Lights & layers check",
        body: `Sunset in ${offsetMin} min near ${first.locationName ?? "you"}. Charge the lights and pack a reflective layer.`,
        tag: `dusk-${first.lat!.toFixed(2)}-${first.lng!.toFixed(2)}`,
        url: "/sun",
        locationName: first.locationName,
      };

      const res = await sendPushToSubscription(s, payload);
      if (res.ok) {
        result.notified += 1;
        await db.pushSubscription.update({
          where: { id: s.id! },
          data: { lastDuskNotifiedAt: new Date(), failureCount: 0 } as never,
        });
      } else if (res.gone) {
        result.removed += 1;
        await db.pushSubscription.delete({ where: { id: s.id! } });
      } else {
        result.errors += 1;
        await db.pushSubscription.update({
          where: { id: s.id! },
          data: { failureCount: { increment: 1 } },
        });
      }
    }
  }

  return result;
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
