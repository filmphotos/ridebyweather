import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthPayload } from "@/lib/auth";
import { db } from "@/lib/db";
import { haversineM } from "@/lib/ride/rideMath";

const TYPES = ["closure", "hazard", "construction", "flooding", "crash", "other"] as const;

// How long a report stays live, by type (ms).
const TTL_MS: Record<(typeof TYPES)[number], number> = {
  closure: 24 * 3600_000,
  hazard: 6 * 3600_000,
  construction: 7 * 24 * 3600_000,
  flooding: 24 * 3600_000,
  crash: 6 * 3600_000,
  other: 12 * 3600_000,
};

const CreateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  type: z.enum(TYPES).default("closure"),
  description: z.string().max(280).optional().nullable(),
  severity: z.enum(["info", "warning", "danger"]).default("warning"),
});

export async function GET(req: NextRequest) {
  const payload = await getAuthPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const lat = parseFloat(sp.get("lat") ?? "");
  const lng = parseFloat(sp.get("lng") ?? "");
  const radiusMi = Math.min(50, Math.max(1, parseFloat(sp.get("radius") ?? "15")));
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  // Bounding box prefilter (≈ degrees per mile), then exact haversine filter.
  const latDelta = radiusMi / 69;
  const lngDelta = radiusMi / (69 * Math.max(0.1, Math.cos((lat * Math.PI) / 180)));

  const rows = await db.roadClosure.findMany({
    where: {
      status: "active",
      expiresAt: { gt: new Date() },
      lat: { gte: lat - latDelta, lte: lat + latDelta },
      lng: { gte: lng - lngDelta, lte: lng + lngDelta },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const radiusM = radiusMi * 1609.34;
  const closures = rows
    .map((r) => ({
      id: r.id,
      lat: r.lat,
      lng: r.lng,
      type: r.type,
      description: r.description,
      severity: r.severity,
      confirmations: r.confirmations,
      createdAt: r.createdAt,
      isMine: r.userId === payload.userId,
      distanceMi: haversineM(lat, lng, r.lat, r.lng) / 1609.34,
    }))
    .filter((c) => c.distanceMi * 1609.34 <= radiusM)
    .sort((a, b) => a.distanceMi - b.distanceMi);

  return NextResponse.json({ closures });
}

export async function POST(req: NextRequest) {
  const payload = await getAuthPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  const closure = await db.roadClosure.create({
    data: {
      userId: payload.userId,
      lat: d.lat,
      lng: d.lng,
      type: d.type,
      description: d.description ?? null,
      severity: d.severity,
      expiresAt: new Date(Date.now() + TTL_MS[d.type]),
    },
    select: { id: true, lat: true, lng: true, type: true, description: true, severity: true },
  });

  return NextResponse.json({ closure }, { status: 201 });
}
