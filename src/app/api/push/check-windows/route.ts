import { NextRequest, NextResponse } from "next/server";
import { checkAndNotifyBestWindows } from "@/lib/push";

// Cron-triggered: scans all opted-in subscriptions and sends a "best ride
// window" push for tomorrow (or later today, if tomorrow has no good slot).
// Same Bearer auth as /api/push/check-storms — they share the CRON_SECRET.
//
// Runs once per evening via .github/workflows/window-check.yml.
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await checkAndNotifyBestWindows();
  return NextResponse.json(result);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await checkAndNotifyBestWindows();
  return NextResponse.json(result);
}

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}
