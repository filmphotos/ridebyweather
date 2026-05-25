import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";

// Returns the count of devices the current user has registered for storm alerts.
export async function GET(req: NextRequest) {
  const token = req.cookies.get("rbw_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const count = await db.pushSubscription.count({
    where: { userId: payload.userId, stormAlerts: true },
  });

  return NextResponse.json({ devices: count });
}
