import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStravaActivityStreams, getValidStravaToken, computeBearings } from "@/lib/strava";

const ImportSchema = z.object({
  activityId: z.number(),
  name: z.string().min(1).max(80),
  sport: z.enum(["cycling", "running"]).default("cycling"),
  distanceMi: z.number().default(0),
});

export async function POST(req: NextRequest) {
  const token = req.cookies.get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = ImportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { activityId, name, sport, distanceMi } = parsed.data;

  try {
    const accessToken = await getValidStravaToken(payload.userId);
    if (!accessToken) return NextResponse.json({ error: "Strava not connected" }, { status: 404 });

    const waypoints = await getStravaActivityStreams(accessToken, activityId);
    if (waypoints.length < 2) {
      return NextResponse.json({ error: "Activity has no GPS data" }, { status: 422 });
    }

    const bearings = computeBearings(waypoints);
    const geometry = JSON.stringify({ type: "LineString", coordinates: waypoints });

    const route = await db.route.create({
      data: {
        userId: payload.userId,
        name,
        sport,
        distance: distanceMi,
        elevationGain: 0,
        geometry,
        bearings: JSON.stringify(bearings),
        segments: JSON.stringify([]),
      },
    });

    return NextResponse.json({ route }, { status: 201 });
  } catch (err) {
    console.error("Strava import error:", err);
    return NextResponse.json({ error: "Failed to import activity" }, { status: 500 });
  }
}
