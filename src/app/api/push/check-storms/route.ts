import { NextRequest, NextResponse } from "next/server";
import { checkAndNotifyAllSubscribers } from "@/lib/push";

// Cron-triggered: scans all opted-in push subscriptions, sends a lightning
// notification for any whose location is in a thunderstorm now or in the
// next few hours. Protected by CRON_SECRET — Vercel Cron sends it as a
// Bearer token in the Authorization header.
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await checkAndNotifyAllSubscribers();
  return NextResponse.json(result);
}

export async function GET(req: NextRequest) {
  // Vercel Cron uses GET — accept both.
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await checkAndNotifyAllSubscribers();
  return NextResponse.json(result);
}

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}
