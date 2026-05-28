import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// The device polls this with its secret until a user approves the pairing.
// On approval it returns the token exactly once, then marks the record consumed.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret) return NextResponse.json({ status: "error" }, { status: 400 });

  const pairing = await db.devicePairing.findUnique({ where: { deviceSecret: secret } });
  if (!pairing) return NextResponse.json({ status: "expired" });

  if (pairing.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ status: "expired" });
  }

  if (pairing.status === "approved" && pairing.token) {
    const token = pairing.token;
    // One-time hand-off: consume so the token can't be re-fetched.
    await db.devicePairing.update({
      where: { id: pairing.id },
      data: { status: "consumed", token: null },
    });
    return NextResponse.json({ status: "approved", token });
  }

  if (pairing.status === "consumed") {
    return NextResponse.json({ status: "consumed" });
  }

  return NextResponse.json({ status: "pending" });
}
