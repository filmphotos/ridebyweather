import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthPayload } from "@/lib/auth";
import { getUserTier, requirePro } from "@/lib/tier";
import { getWeatherProvider, type WeatherLocation } from "@/lib/weather";
import { computeCyclingScore, type RouteWindSegment } from "@/lib/ride-score";

// Route Weather Overlay (Pro feature).
// Given a set of route waypoints, fetch hourly weather at the route's
// centroid for the next ~24 hours and compute a route-aware Ride Score
// for each hour. The client renders a 24-bar timeline so the rider can
// pick the best departure window for *this specific route*.
//
// Why this is Pro:
// - Free's existing Route & Wind Planner shows current-wind segment colors.
// - Pro adds time-of-day forecasting so you can see "leave at 7 AM = 8.2,
//   leave at 4 PM = 4.1" without manually checking every hour.

const HOURS = 24;
const MAX_WAYPOINTS = 500;

const PostSchema = z.object({
  // Polyline waypoints in [lng, lat] order — same shape /api/routes uses.
  waypoints: z.array(z.tuple([z.number(), z.number()])).min(2).max(MAX_WAYPOINTS),
});

export async function POST(req: NextRequest) {
  const payload = await getAuthPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tier = await getUserTier(payload.userId);
  const gate = requirePro(tier, "Route Weather Overlay (24-hour route forecast)");
  if (gate) return gate;

  const body = await req.json().catch(() => null);
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid waypoints" }, { status: 400 });

  const { waypoints } = parsed.data;

  // Build per-segment bearings + distances once; reuse across all 24 hours.
  const segments = waypointsToSegments(waypoints);
  if (segments.length === 0) {
    return NextResponse.json({ error: "Route too short" }, { status: 400 });
  }

  // Use the geometric centroid as the weather lookup point. For typical
  // sub-50-mi rides the wind doesn't vary meaningfully across the route;
  // a single forecast keeps us under Open-Meteo's free-tier budget.
  const centroid = centroidOf(waypoints);

  let hourly: Awaited<ReturnType<ReturnType<typeof getWeatherProvider>["getHourlyForecast"]>>;
  try {
    const provider = getWeatherProvider();
    hourly = await provider.getHourlyForecast(centroid, HOURS);
  } catch {
    return NextResponse.json({ error: "Forecast unavailable" }, { status: 502 });
  }

  const forecast = hourly.map((h) => {
    const result = computeCyclingScore(h.weather, segments);
    return {
      timestamp: h.timestamp.toISOString(),
      score: result.score,
      label: result.label,
      color: result.hexColor,
      windDirDeg: h.weather.windDirDeg,
      windSpeedMph: h.weather.windSpeedMph,
      tempF: h.weather.tempF,
      precipProb: h.weather.precipProb,
      condition: h.weather.condition,
      windType: result.breakdown.windType,
      windPercent: result.breakdown.windPercent,
    };
  });

  // Surface the best/worst slots so the UI doesn't have to re-derive them.
  let best = forecast[0];
  let worst = forecast[0];
  for (const f of forecast) {
    if (f.score > best.score) best = f;
    if (f.score < worst.score) worst = f;
  }

  return NextResponse.json({
    forecast,
    centroid,
    distanceMi: segmentsToMiles(segments),
    best,
    worst,
  });
}

function waypointsToSegments(waypoints: [number, number][]): RouteWindSegment[] {
  const out: RouteWindSegment[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const [lng1, lat1] = waypoints[i];
    const [lng2, lat2] = waypoints[i + 1];
    out.push({
      bearingDeg: bearing(lat1, lng1, lat2, lng2),
      distanceKm: haversineKm(lat1, lng1, lat2, lng2),
    });
  }
  return out;
}

function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function centroidOf(waypoints: [number, number][]): WeatherLocation {
  let sx = 0, sy = 0;
  for (const [lng, lat] of waypoints) {
    sx += lng;
    sy += lat;
  }
  return { lng: sx / waypoints.length, lat: sy / waypoints.length };
}

function segmentsToMiles(segments: RouteWindSegment[]): number {
  return segments.reduce((s, x) => s + x.distanceKm * 0.621371, 0);
}
