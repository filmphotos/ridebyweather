import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/admin";
import { db } from "@/lib/db";
import { checkAndNotifyAllSubscribers, getVapidPublicKey } from "@/lib/push";

// GET — return push system status + recent subscriptions (admin only)
export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [total, optedIn, recent] = await Promise.all([
    db.pushSubscription.count(),
    db.pushSubscription.count({ where: { stormAlerts: true } }),
    db.pushSubscription.findMany({
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true,
        userId: true,
        locationName: true,
        lat: true,
        lng: true,
        stormAlerts: true,
        lastNotifiedAt: true,
        failureCount: true,
        userAgent: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    vapidConfigured: Boolean(getVapidPublicKey()),
    cronConfigured: Boolean(process.env.CRON_SECRET),
    counts: { total, optedIn },
    recent,
  });
}

// POST — manually trigger the storm-check sweep (same logic the cron runs)
export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await checkAndNotifyAllSubscribers();
  return NextResponse.json({ triggeredBy: admin.email, ...result });
}
