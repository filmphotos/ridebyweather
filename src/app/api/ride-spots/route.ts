import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthPayload } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserTier, limitsFor } from "@/lib/tier";

// GET — list the user's saved spots.
export async function GET(req: NextRequest) {
  const payload = await getAuthPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [spots, tier] = await Promise.all([
    db.rideSpot.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: "asc" },
    }),
    getUserTier(payload.userId),
  ]);

  const limit = limitsFor(tier).spots;
  return NextResponse.json({
    spots,
    tier,
    limit: limit === Infinity ? null : limit,
  });
}

const CreateSchema = z.object({
  name: z.string().min(1).max(80),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  locationName: z.string().max(200).optional().nullable(),
  sport: z.enum(["cycling", "running", "walking"]).optional(),
});

// POST — save a new spot. Free tier capped at FREE_LIMITS.spots; over the
// cap we return 402 so the client can open the paywall.
export async function POST(req: NextRequest) {
  const payload = await getAuthPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const tier = await getUserTier(payload.userId);
  const limit = limitsFor(tier).spots;
  const count = await db.rideSpot.count({ where: { userId: payload.userId } });
  if (count >= limit) {
    return NextResponse.json(
      {
        error: "Spot limit reached",
        feature: "Multi-location 'Where should I ride?' scanner",
        limit,
        tier,
        upgradeUrl: "/pricing",
      },
      { status: 402 }
    );
  }

  const spot = await db.rideSpot.create({
    data: {
      userId: payload.userId,
      name: parsed.data.name,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      locationName: parsed.data.locationName ?? null,
      sport: parsed.data.sport ?? "cycling",
    },
  });

  return NextResponse.json({ spot });
}
