import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Public read for the /watch/<token> page — no auth (the token is the secret).
const STALE_MS = 5 * 60 * 1000;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const session = await db.liveSession.findUnique({
    where: { token },
    include: { user: { select: { name: true } } },
  });
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let path: number[][] = [];
  try {
    const parsed = JSON.parse(session.path);
    if (Array.isArray(parsed)) path = parsed;
  } catch {
    // ignore
  }

  const stale = session.status === "active" && Date.now() - session.updatedAt.getTime() > STALE_MS;

  return NextResponse.json({
    riderName: session.user?.name || "A rider",
    sport: session.sport,
    status: session.status,
    stale,
    startedAt: session.startedAt,
    updatedAt: session.updatedAt,
    endedAt: session.endedAt,
    lat: session.lat,
    lng: session.lng,
    speedMph: session.speedMph,
    headingDeg: session.headingDeg,
    distanceMi: session.distanceMi,
    elapsedSec: session.elapsedSec,
    path,
  });
}
