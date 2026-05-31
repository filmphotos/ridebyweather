import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWeatherProvider } from "@/lib/weather";
import { computeCyclingScore, type WeatherInput } from "@/lib/ride-score";
import { sendEmail } from "@/lib/email";
import { verifyToken } from "@/lib/auth";

// Builds a per-user weekly digest of the next 7 days of Ride Scores at the
// user's preferred push location, with the best day highlighted.
//
// Auth modes:
// - Bearer CRON_SECRET → batch send to all opted-in subscriptions.
// - Logged-in user cookie → preview their own digest (returns JSON).
//
// Subscriptions reuse the existing push_subscriptions.windowAlerts toggle for
// MVP — separate digest opt-in can come later.

export async function GET(req: NextRequest) {
  // Cron path.
  const auth = req.headers.get("authorization");
  if (auth && process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) {
    const result = await runBatch();
    return NextResponse.json(result);
  }

  // User preview path.
  const token = req.cookies.get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await db.pushSubscription.findFirst({
    where: { userId: payload.userId, NOT: [{ lat: null }, { lng: null }] },
  });
  if (!sub || sub.lat == null || sub.lng == null) {
    return NextResponse.json({ error: "No saved location — visit /settings to enable push first." }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id: payload.userId }, select: { email: true, name: true } });
  const digest = await buildDigest({ lat: sub.lat, lng: sub.lng, locationName: sub.locationName, name: user?.name });
  return NextResponse.json({ user: { email: user?.email, name: user?.name }, ...digest });
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runBatch();
  return NextResponse.json(result);
}

async function runBatch() {
  const subs = await db.pushSubscription.findMany({
    where: { windowAlerts: true, NOT: [{ lat: null }, { lng: null }] },
    include: { user: { select: { email: true, name: true } } },
  });
  let sent = 0;
  let failed = 0;
  for (const sub of subs) {
    if (sub.lat == null || sub.lng == null) continue;
    try {
      const digest = await buildDigest({ lat: sub.lat, lng: sub.lng, locationName: sub.locationName, name: sub.user.name });
      const subject = `This week's best ride day: ${digest.best.dayLabel}`;
      await sendEmail({
        to: sub.user.email,
        subject,
        html: digest.html,
        text: digest.text,
      });
      sent++;
    } catch (err) {
      console.error("Weekly digest send failed:", err);
      failed++;
    }
  }
  return { sent, failed };
}

interface DigestInputs {
  lat: number;
  lng: number;
  locationName: string | null;
  name: string | null | undefined;
}

async function buildDigest(opts: DigestInputs) {
  const provider = getWeatherProvider();
  const daily = await provider.getDailyForecast({ lat: opts.lat, lng: opts.lng }, 7);

  const rows = daily.map((d) => {
    const w: WeatherInput = {
      tempF: d.tempMaxF,
      feelsLikeF: d.tempMaxF,
      humidity: 55,
      windSpeedMph: d.windSpeedMaxMph,
      windGustMph: d.windGustMaxMph,
      windDirDeg: d.windDirDeg,
      precipProb: d.precipProb,
      precipInch: 0,
      condition: d.condition,
      isStorm: d.isStorm,
      isIce: d.isIce,
      uvIndex: d.uvIndexMax,
    };
    const r = computeCyclingScore(w);
    return {
      date: d.date,
      score: r.score,
      label: r.label,
      color: r.hexColor,
      tempMaxF: d.tempMaxF,
      tempMinF: d.tempMinF,
      precipProb: d.precipProb,
      windSpeedMaxMph: d.windSpeedMaxMph,
      condition: d.condition,
    };
  });

  const best = rows.reduce((a, b) => (b.score > a.score ? b : a), rows[0]);
  const bestDate = new Date(best.date);
  const dayLabel = bestDate.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  const where = opts.locationName ?? "your area";
  const name = opts.name ?? "rider";

  const text = [
    `Hi ${name},`,
    "",
    `Here's the week ahead for ${where}.`,
    "",
    `Best ride day: ${dayLabel} — Ride Score ${best.score.toFixed(1)} (${best.label}).`,
    `Expect ${Math.round(best.tempMinF)}–${Math.round(best.tempMaxF)}°F, wind ${Math.round(best.windSpeedMaxMph)} mph, ${Math.round(best.precipProb * 100)}% rain.`,
    "",
    "Full week:",
    ...rows.map((r) => {
      const d = new Date(r.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      return `  ${d}: ${r.score.toFixed(1)} (${r.label}) — ${Math.round(r.tempMaxF)}°F, ${Math.round(r.precipProb * 100)}% rain`;
    }),
    "",
    "Ride well.",
    "— RideByWeather",
  ].join("\n");

  const html = `<!doctype html>
<html><body style="font-family:system-ui,-apple-system,sans-serif;background:#0b1220;color:#e5e7eb;padding:24px;margin:0">
  <div style="max-width:560px;margin:0 auto;background:#111827;border:1px solid #1f2937;border-radius:12px;padding:32px">
    <h1 style="margin:0 0 4px;color:#fff;font-size:22px">This week's ride outlook</h1>
    <p style="margin:0 0 24px;color:#9ca3af;font-size:14px">${where}</p>
    <div style="background:${best.color}22;border:1px solid ${best.color}55;border-radius:12px;padding:20px;margin-bottom:24px">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af">Best ride day</div>
      <div style="font-size:24px;font-weight:700;color:#fff;margin-top:4px">${dayLabel}</div>
      <div style="font-size:36px;font-weight:700;color:${best.color};margin-top:8px">${best.score.toFixed(1)} <span style="font-size:14px;font-weight:500;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em">${best.label}</span></div>
      <div style="color:#cbd5e1;font-size:14px;margin-top:8px">${Math.round(best.tempMinF)}–${Math.round(best.tempMaxF)}°F · wind ${Math.round(best.windSpeedMaxMph)} mph · ${Math.round(best.precipProb * 100)}% rain</div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px;color:#e5e7eb">
      <thead><tr style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.08em">
        <th align="left" style="padding:6px 0">Day</th>
        <th align="left" style="padding:6px 0">Score</th>
        <th align="left" style="padding:6px 0">Temp</th>
        <th align="left" style="padding:6px 0">Rain</th>
      </tr></thead>
      <tbody>
      ${rows.map((r) => {
        const d = new Date(r.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
        return `<tr style="border-top:1px solid #1f2937"><td style="padding:8px 0;color:#cbd5e1">${d}</td><td style="padding:8px 0;color:${r.color};font-weight:700">${r.score.toFixed(1)}</td><td style="padding:8px 0">${Math.round(r.tempMaxF)}°F</td><td style="padding:8px 0">${Math.round(r.precipProb * 100)}%</td></tr>`;
      }).join("")}
      </tbody>
    </table>
    <p style="margin:24px 0 0;color:#6b7280;font-size:12px">You can unsubscribe from this digest anytime in <a href="https://ridebyweather.com/settings" style="color:#0ea5e9">your settings</a>.</p>
  </div>
</body></html>`;

  return { rows, best: { ...best, dayLabel }, html, text };
}
