import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  PAIRING_TTL_MS,
  generateDeviceSecret,
  generatePairingCode,
} from "@/lib/devicePairing";

export const dynamic = "force-dynamic";

// Device (Garmin/Wear) requests a pairing code to display. No auth required —
// the code is useless until a logged-in user approves it.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const deviceLabel = typeof body?.device === "string" ? body.device.slice(0, 40) : null;

    // Retry a couple of times in the unlikely event of a code/secret collision.
    let pairing = null;
    for (let attempt = 0; attempt < 3 && !pairing; attempt++) {
      const code = generatePairingCode();
      const deviceSecret = generateDeviceSecret();
      try {
        pairing = await db.devicePairing.create({
          data: {
            code,
            deviceSecret,
            deviceLabel,
            status: "pending",
            expiresAt: new Date(Date.now() + PAIRING_TTL_MS),
          },
        });
      } catch {
        pairing = null; // collision on unique field — try again
      }
    }

    if (!pairing) {
      return NextResponse.json({ error: "Could not create pairing" }, { status: 500 });
    }

    const origin = new URL(req.url).origin;
    return NextResponse.json({
      code: pairing.code,
      deviceSecret: pairing.deviceSecret,
      expiresInSec: Math.floor(PAIRING_TTL_MS / 1000),
      verificationUrl: `${origin}/link?code=${pairing.code}`,
      qrUrl: `${origin}/api/device/qr?code=${pairing.code}`,
    });
  } catch (err) {
    console.error("device/code error:", err);
    return NextResponse.json({ error: "Failed to start pairing" }, { status: 500 });
  }
}
