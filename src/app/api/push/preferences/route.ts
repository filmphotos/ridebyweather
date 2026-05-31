import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";

// Flip individual alert toggles (storm, ride-window) on an existing
// subscription. Identified by endpoint so the same user can have different
// preferences on phone vs. desktop.

const PrefsSchema = z.object({
  endpoint: z.string().url(),
  stormAlerts: z.boolean().optional(),
  windowAlerts: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const token = req.cookies.get("rbw_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = PrefsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const data: { stormAlerts?: boolean; windowAlerts?: boolean } = {};
  if (parsed.data.stormAlerts !== undefined) data.stormAlerts = parsed.data.stormAlerts;
  if (parsed.data.windowAlerts !== undefined) data.windowAlerts = parsed.data.windowAlerts;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // updateMany scoped by userId so a user can't flip another user's prefs
  // even with a stolen endpoint URL.
  const result = await db.pushSubscription.updateMany({
    where: { endpoint: parsed.data.endpoint, userId: payload.userId },
    data,
  });

  return NextResponse.json({ ok: true, updated: result.count });
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("rbw_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const endpoint = req.nextUrl.searchParams.get("endpoint");
  if (!endpoint) return NextResponse.json({ error: "endpoint required" }, { status: 400 });

  const sub = await db.pushSubscription.findFirst({
    where: { endpoint, userId: payload.userId },
    select: { stormAlerts: true, windowAlerts: true },
  });
  if (!sub) return NextResponse.json({ found: false }, { status: 404 });

  return NextResponse.json({ found: true, ...sub });
}
