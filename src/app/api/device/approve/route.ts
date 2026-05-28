import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthPayload, signToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Called by the /link page after a logged-in user confirms the on-device code.
// Binds a freshly minted token to the pairing record.
export async function POST(req: NextRequest) {
  const payload = await getAuthPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

  const pairing = await db.devicePairing.findUnique({ where: { code } });
  if (!pairing) return NextResponse.json({ error: "Unknown code" }, { status: 404 });
  if (pairing.status !== "pending") {
    return NextResponse.json({ error: "Code already used" }, { status: 409 });
  }
  if (pairing.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Code expired" }, { status: 410 });
  }

  const token = await signToken({ userId: payload.userId, email: payload.email });

  await db.devicePairing.update({
    where: { id: pairing.id },
    data: { status: "approved", token, userId: payload.userId },
  });

  return NextResponse.json({ ok: true });
}
