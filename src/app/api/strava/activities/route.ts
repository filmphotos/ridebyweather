import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { getStravaActivities, getValidStravaToken, stravaTypeToSport } from "@/lib/strava";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const accessToken = await getValidStravaToken(payload.userId);
    if (!accessToken) return NextResponse.json({ error: "Strava not connected" }, { status: 404 });

    const raw = await getStravaActivities(accessToken, 20);
    const activities = raw
      .filter((a) => {
        const t = a.sport_type ?? a.type;
        const keep = ["Ride", "Run", "TrailRun", "VirtualRide", "EBikeRide", "GravelRide", "MountainBikeRide"];
        return keep.includes(t);
      })
      .map((a) => ({
        id: a.id,
        name: a.name,
        type: a.sport_type ?? a.type,
        sport: stravaTypeToSport(a.sport_type ?? a.type),
        distanceMi: parseFloat((a.distance / 1609.34).toFixed(1)),
        elevationFt: Math.round(a.total_elevation_gain * 3.28084),
        startDate: a.start_date,
        hasGps: !!a.map?.summary_polyline,
      }));

    return NextResponse.json({ activities });
  } catch (err) {
    console.error("Strava activities error:", err);
    return NextResponse.json({ error: "Failed to fetch Strava activities" }, { status: 500 });
  }
}
