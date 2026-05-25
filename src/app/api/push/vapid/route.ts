import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/push";

export async function GET() {
  const key = getVapidPublicKey();
  if (!key) {
    return NextResponse.json(
      { error: "Push notifications not configured", configured: false },
      { status: 503 }
    );
  }
  return NextResponse.json({ publicKey: key, configured: true });
}
