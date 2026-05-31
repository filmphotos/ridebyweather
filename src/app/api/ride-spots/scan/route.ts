import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWeatherProvider } from "@/lib/weather";
import { findBestRideWindow } from "@/lib/push";

// The "Where should I ride?" scanner — the Pro killer feature.
// For each of the user's saved spots, fetch the next 36 hours of hourly
// weather, find the best daylight 2-hour window, and rank them by score.
//
// Weather calls run in parallel — typically ~1s for 10 spots on a warm
// Open-Meteo cache. We cap to 12 spots so an oversized list can't fan
// out into a slow request.

const MAX_FAN_OUT = 12;

export async function GET(req: NextRequest) {
  const payload = await getAuthPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const spots = await db.rideSpot.findMany({
    where: { userId: payload.userId },
    orderBy: { createdAt: "asc" },
    take: MAX_FAN_OUT,
  });

  if (spots.length === 0) {
    return NextResponse.json({ rankings: [] });
  }

  const provider = getWeatherProvider();

  // Fan out the hourly forecast lookups. Errors on individual spots are
  // swallowed so one flaky region doesn't fail the whole scan.
  const rankings = await Promise.all(
    spots.map(async (spot) => {
      try {
        const forecast = await provider.getHourlyForecast(
          { lat: spot.lat, lng: spot.lng },
          36
        );
        const window = findBestRideWindow(forecast);
        return {
          spot: {
            id: spot.id,
            name: spot.name,
            locationName: spot.locationName,
            lat: spot.lat,
            lng: spot.lng,
            sport: spot.sport,
          },
          window,
        };
      } catch {
        return {
          spot: {
            id: spot.id,
            name: spot.name,
            locationName: spot.locationName,
            lat: spot.lat,
            lng: spot.lng,
            sport: spot.sport,
          },
          window: null,
          error: "Could not load forecast",
        };
      }
    })
  );

  // Highest avgScore first; spots with no window sink to the bottom.
  rankings.sort((a, b) => (b.window?.avgScore ?? -1) - (a.window?.avgScore ?? -1));

  return NextResponse.json({ rankings });
}
