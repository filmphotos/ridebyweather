import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { getUserTier, limitsFor } from "@/lib/tier";

const SaveRouteSchema = z.object({
  name: z.string().min(1).max(80),
  sport: z.enum(["cycling", "running"]).default("cycling"),
  waypoints: z.array(z.tuple([z.number(), z.number()])).min(2), // [lng, lat][]
  segments: z.array(z.object({
    windType: z.enum(["tailwind", "headwind", "crosswind"]),
    color: z.string(),
  })),
  distanceMi: z.number().default(0),
});

async function getPayload(req: NextRequest) {
  const token = req.cookies.get("rbw_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  const payload = await getPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const routes = await db.route.findMany({
    where: { userId: payload.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      sport: true,
      distance: true,
      geometry: true,
      segments: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ routes });
}

export async function POST(req: NextRequest) {
  const payload = await getPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = SaveRouteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  // Free tier: capped at FREE_LIMITS.routes saved routes. Pro is unlimited.
  // Returning 402 lets the client open the paywall instead of a generic
  // error toast.
  const tier = await getUserTier(payload.userId);
  const limit = limitsFor(tier).routes;
  if (Number.isFinite(limit)) {
    const count = await db.route.count({ where: { userId: payload.userId } });
    if (count >= limit) {
      return NextResponse.json(
        {
          error: "Saved route limit reached",
          feature: "Unlimited saved routes",
          limit,
          tier,
          upgradeUrl: "/pricing",
        },
        { status: 402 }
      );
    }
  }

  const { name, sport, waypoints, segments, distanceMi } = parsed.data;

  // Build bearings between consecutive waypoints
  const bearings: number[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const [lng1, lat1] = waypoints[i];
    const [lng2, lat2] = waypoints[i + 1];
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const lat1R = (lat1 * Math.PI) / 180;
    const lat2R = (lat2 * Math.PI) / 180;
    const y = Math.sin(dLng) * Math.cos(lat2R);
    const x = Math.cos(lat1R) * Math.sin(lat2R) - Math.sin(lat1R) * Math.cos(lat2R) * Math.cos(dLng);
    bearings.push(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
  }

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
      segments: JSON.stringify(segments),
    },
  });

  return NextResponse.json({ route }, { status: 201 });
}
