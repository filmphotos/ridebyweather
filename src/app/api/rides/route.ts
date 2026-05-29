import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthPayload } from "@/lib/auth";
import { db } from "@/lib/db";

// Cap how many rides we keep server-side per user, mirroring the client cap
// in rideStorage.ts so syncing doesn't accumulate forever.
const MAX_RIDES = 30;

// We store the heavy arrays as JSON strings (the Prisma model uses TEXT
// columns for SQLite compat). We don't re-validate every TrackPoint here —
// just bound the size so a malicious client can't push gigabytes.
const MAX_JSON_BYTES = 5 * 1024 * 1024; // 5 MB per ride

const PostSchema = z.object({
  id: z.string().min(1).max(120),
  startedAt: z.number().int(),
  endedAt: z.number().int(),
  sport: z.enum(["cycling", "running", "walking"]).optional(),
  totalDistMi: z.number().finite(),
  // Client accumulates these as fractional seconds; we round before storing
  // (the column is Int). Don't require .int() in validation or every upload
  // 400s silently.
  movingTimeSec: z.number().finite().nonnegative(),
  totalTimeSec: z.number().finite().nonnegative(),
  avgSpeedMph: z.number().finite(),
  maxSpeedMph: z.number().finite(),
  ascentFt: z.number().finite(),
  descentFt: z.number().finite(),
  avgHrBpm: z.number().int().optional().nullable(),
  maxHrBpm: z.number().int().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  points: z.array(z.unknown()).optional(),
  laps: z.array(z.unknown()).optional(),
  stops: z.array(z.unknown()).optional(),
});

export async function GET(req: NextRequest) {
  const payload = await getAuthPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Summaries only — the points array can be hundreds of KB per ride and the
  // history list view doesn't need it. Detail endpoint serves the full record.
  const rows = await db.ride.findMany({
    where: { userId: payload.userId },
    orderBy: { startedAt: "desc" },
    take: MAX_RIDES,
    select: {
      id: true,
      startedAt: true,
      endedAt: true,
      sport: true,
      totalDistMi: true,
      movingTimeSec: true,
      totalTimeSec: true,
      avgSpeedMph: true,
      maxSpeedMph: true,
      ascentFt: true,
      descentFt: true,
      avgHrBpm: true,
      maxHrBpm: true,
      laps: true,
      stops: true,
    },
  });

  const rides = rows.map((r) => ({
    id: r.id,
    startedAt: r.startedAt.getTime(),
    endedAt: r.endedAt.getTime(),
    sport: r.sport,
    totalDistMi: r.totalDistMi,
    movingTimeSec: r.movingTimeSec,
    totalTimeSec: r.totalTimeSec,
    avgSpeedMph: r.avgSpeedMph,
    maxSpeedMph: r.maxSpeedMph,
    ascentFt: r.ascentFt,
    descentFt: r.descentFt,
    avgHrBpm: r.avgHrBpm ?? undefined,
    maxHrBpm: r.maxHrBpm ?? undefined,
    laps: safeParseArray(r.laps),
    stops: safeParseArray(r.stops),
  }));

  return NextResponse.json({ rides });
}

export async function POST(req: NextRequest) {
  const payload = await getAuthPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = PostSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid ride", details: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  const pointsJson = JSON.stringify(d.points ?? []);
  const lapsJson = JSON.stringify(d.laps ?? []);
  const stopsJson = JSON.stringify(d.stops ?? []);
  if (pointsJson.length > MAX_JSON_BYTES) {
    return NextResponse.json({ error: "Ride too large" }, { status: 413 });
  }

  // Upsert by id — the client generates `ride_<startedAt>` so re-syncing the
  // same ride is idempotent. Scope to userId on update so one user can't
  // overwrite another's ride that happens to collide on id.
  const existing = await db.ride.findUnique({ where: { id: d.id }, select: { userId: true } });
  if (existing && existing.userId !== payload.userId) {
    return NextResponse.json({ error: "Conflict" }, { status: 409 });
  }

  await db.ride.upsert({
    where: { id: d.id },
    create: {
      id: d.id,
      userId: payload.userId,
      startedAt: new Date(d.startedAt),
      endedAt: new Date(d.endedAt),
      sport: d.sport ?? "cycling",
      totalDistMi: d.totalDistMi,
      movingTimeSec: Math.round(d.movingTimeSec),
      totalTimeSec: Math.round(d.totalTimeSec),
      avgSpeedMph: d.avgSpeedMph,
      maxSpeedMph: d.maxSpeedMph,
      ascentFt: d.ascentFt,
      descentFt: d.descentFt,
      avgHrBpm: d.avgHrBpm ?? null,
      maxHrBpm: d.maxHrBpm ?? null,
      notes: d.notes ?? null,
      points: pointsJson,
      laps: lapsJson,
      stops: stopsJson,
    },
    update: {
      // Most fields are immutable after a ride ends; we update them anyway in
      // case the client re-uploads a corrected version (e.g. after edits).
      startedAt: new Date(d.startedAt),
      endedAt: new Date(d.endedAt),
      sport: d.sport ?? "cycling",
      totalDistMi: d.totalDistMi,
      movingTimeSec: Math.round(d.movingTimeSec),
      totalTimeSec: Math.round(d.totalTimeSec),
      avgSpeedMph: d.avgSpeedMph,
      maxSpeedMph: d.maxSpeedMph,
      ascentFt: d.ascentFt,
      descentFt: d.descentFt,
      avgHrBpm: d.avgHrBpm ?? null,
      maxHrBpm: d.maxHrBpm ?? null,
      notes: d.notes ?? null,
      points: pointsJson,
      laps: lapsJson,
      stops: stopsJson,
    },
  });

  // Trim down to MAX_RIDES — drop the oldest beyond the cap.
  const count = await db.ride.count({ where: { userId: payload.userId } });
  if (count > MAX_RIDES) {
    const oldest = await db.ride.findMany({
      where: { userId: payload.userId },
      orderBy: { startedAt: "asc" },
      take: count - MAX_RIDES,
      select: { id: true },
    });
    if (oldest.length > 0) {
      await db.ride.deleteMany({ where: { id: { in: oldest.map((o) => o.id) } } });
    }
  }

  return NextResponse.json({ ok: true });
}

function safeParseArray(s: string): unknown[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
