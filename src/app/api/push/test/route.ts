import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendPushToSubscription } from "@/lib/push";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("rbw_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subs = await db.pushSubscription.findMany({
    where: { userId: payload.userId },
  });
  if (subs.length === 0) {
    return NextResponse.json({ error: "No registered devices" }, { status: 404 });
  }

  let sent = 0;
  let removed = 0;
  for (const s of subs) {
    const res = await sendPushToSubscription(s, {
      title: "⚡ Test storm alert",
      body: "If you see this, lightning alerts are working on this device.",
      tag: `test-${s.id}`,
      url: "/",
    });
    if (res.ok) sent += 1;
    else if (res.gone) {
      removed += 1;
      await db.pushSubscription.delete({ where: { id: s.id } });
    }
  }

  return NextResponse.json({ sent, removed, total: subs.length });
}
