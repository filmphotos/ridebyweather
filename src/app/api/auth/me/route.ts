import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("rbw_token")?.value;
  if (!token) return NextResponse.json({ user: null });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ user: null });

  try {
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        subscription: { select: { tier: true, status: true } },
      },
    });
    if (!user) return NextResponse.json({ user: null });
    return NextResponse.json({ user, tier: user.subscription?.tier ?? "free" });
  } catch {
    return NextResponse.json({ user: null });
  }
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("rbw_token");
  return res;
}
