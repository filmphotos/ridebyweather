import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";
import { db } from "@/lib/db";
import { appOrigin } from "@/lib/appUrl";

const SPORTS = new Set(["cycling", "running", "walking"]);

export async function POST(req: NextRequest) {
  const payload = await getAuthPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const sport = SPORTS.has(body?.sport) ? body.sport : "cycling";

  // Only one active share at a time — retire any leftovers from a prior ride.
  await db.liveSession.updateMany({
    where: { userId: payload.userId, status: "active" },
    data: { status: "ended", endedAt: new Date() },
  });

  const session = await db.liveSession.create({
    data: { userId: payload.userId, sport },
    select: { token: true },
  });

  return NextResponse.json({
    token: session.token,
    watchUrl: `${appOrigin(req)}/watch/${session.token}`,
  });
}
