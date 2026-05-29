import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthPayload } from "@/lib/auth";
import { db } from "@/lib/db";

const MAX_PATH_POINTS = 1000;

const PingSchema = z.object({
  token: z.string().min(1),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  speedMph: z.number().min(0).max(200).optional(),
  headingDeg: z.number().min(0).max(360).optional(),
  distanceMi: z.number().min(0).max(100000).optional(),
  elapsedSec: z.number().int().min(0).optional(),
  ended: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const payload = await getAuthPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = PingSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  const session = await db.liveSession.findUnique({ where: { token: d.token } });
  if (!session || session.userId !== payload.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let path: number[][] = [];
  try {
    const parsedPath = JSON.parse(session.path);
    if (Array.isArray(parsedPath)) path = parsedPath;
  } catch {
    // corrupt path — start fresh rather than fail the ping
  }
  if (d.lat != null && d.lng != null) {
    path.push([d.lng, d.lat]);
    if (path.length > MAX_PATH_POINTS) path = path.slice(-MAX_PATH_POINTS);
  }

  await db.liveSession.update({
    where: { token: d.token },
    data: {
      lat: d.lat ?? session.lat,
      lng: d.lng ?? session.lng,
      speedMph: d.speedMph ?? session.speedMph,
      headingDeg: d.headingDeg ?? session.headingDeg,
      distanceMi: d.distanceMi ?? session.distanceMi,
      elapsedSec: d.elapsedSec ?? session.elapsedSec,
      path: JSON.stringify(path),
      ...(d.ended ? { status: "ended", endedAt: new Date() } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
