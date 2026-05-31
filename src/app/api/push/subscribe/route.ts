import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";

const SubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  locationName: z.string().max(200).optional().nullable(),
  userAgent: z.string().max(500).optional().nullable(),
  // Optional opt-in for the daily "best ride window" push. Defaults to true
  // so brand-new subscribers get the killer feature automatically; they can
  // turn it off from the settings toggle.
  windowAlerts: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const token = req.cookies.get("rbw_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = SubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }
  const { endpoint, keys, lat, lng, locationName, userAgent, windowAlerts } = parsed.data;
  const wantsWindow = windowAlerts ?? true;

  const sub = await db.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: payload.userId,
      endpoint,
      p256dh: keys.p256dh,
      authKey: keys.auth,
      lat,
      lng,
      locationName: locationName ?? null,
      userAgent: userAgent ?? null,
      stormAlerts: true,
      windowAlerts: wantsWindow,
    },
    update: {
      userId: payload.userId,
      p256dh: keys.p256dh,
      authKey: keys.auth,
      lat,
      lng,
      locationName: locationName ?? null,
      userAgent: userAgent ?? null,
      stormAlerts: true,
      // On re-subscribe, only flip windowAlerts on if the caller asked for it;
      // don't trample an explicit opt-out the user made earlier.
      ...(windowAlerts === true ? { windowAlerts: true } : {}),
      failureCount: 0,
    },
  });

  return NextResponse.json({ ok: true, id: sub.id });
}
