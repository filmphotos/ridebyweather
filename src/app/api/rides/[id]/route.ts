import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = await getAuthPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const r = await db.ride.findFirst({
    where: { id, userId: payload.userId },
  });
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ride: {
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
      notes: r.notes ?? undefined,
      points: safeParseArray(r.points),
      laps: safeParseArray(r.laps),
      stops: safeParseArray(r.stops),
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = await getAuthPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await db.ride.deleteMany({
    where: { id, userId: payload.userId },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
