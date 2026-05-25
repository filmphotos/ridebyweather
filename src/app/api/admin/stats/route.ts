import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/admin";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsers7d,
    totalRoutes,
    proSubs,
    enterpriseSubs,
    activeSubs,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: since } } }),
    db.route.count(),
    db.subscription.count({ where: { tier: "pro" } }),
    db.subscription.count({ where: { tier: "enterprise" } }),
    db.subscription.count({ where: { status: "active", tier: { in: ["pro", "enterprise"] } } }),
  ]);

  return NextResponse.json({
    totalUsers,
    newUsers7d,
    totalRoutes,
    proSubs,
    enterpriseSubs,
    activeSubs,
    estimatedMrr: proSubs * 9 + enterpriseSubs * 49,
  });
}
