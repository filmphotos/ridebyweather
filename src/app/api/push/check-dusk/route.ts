import { NextRequest, NextResponse } from "next/server";
import { checkAndNotifyDusk } from "@/lib/push";

// Cron-triggered: scans all dusk-alerts subscriptions and sends a "lights &
// layers" reminder at (local sunset − duskOffsetMin) ±30 min. Runs hourly
// from Vercel Cron; the handler dedupes its own firings.
export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await checkAndNotifyDusk();
  return NextResponse.json(result);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await checkAndNotifyDusk();
  return NextResponse.json(result);
}

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}
