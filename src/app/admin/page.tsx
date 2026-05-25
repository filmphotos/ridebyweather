import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminFromCookies } from "@/lib/admin";
import { db } from "@/lib/db";
import AdminDashboard from "./AdminDashboard";

export const metadata: Metadata = { title: "Admin — RideByWeather" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await getAdminFromCookies();
  if (!admin) redirect("/admin/login");

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsers7d,
    totalRoutes,
    proSubs,
    enterpriseSubs,
    recentUsers,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: since } } }),
    db.route.count(),
    db.subscription.count({ where: { tier: "pro" } }),
    db.subscription.count({ where: { tier: "enterprise" } }),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        subscription: { select: { tier: true, status: true } },
      },
    }),
  ]);

  const stats = {
    totalUsers,
    newUsers7d,
    totalRoutes,
    proSubs,
    enterpriseSubs,
    estimatedMrr: proSubs * 9 + enterpriseSubs * 49,
  };

  return (
    <AdminDashboard
      admin={admin}
      stats={stats}
      recentUsers={recentUsers.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      }))}
    />
  );
}
