import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await db.deviceIntegration.delete({
      where: { userId_provider: { userId: payload.userId, provider: "strava" } },
    });
  } catch {
    // Already disconnected — not an error
  }

  return NextResponse.json({ ok: true });
}
