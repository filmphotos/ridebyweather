"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface RecentUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  subscription: { tier: string; status: string } | null;
}

interface Stats {
  totalUsers: number;
  newUsers7d: number;
  totalRoutes: number;
  proSubs: number;
  enterpriseSubs: number;
  estimatedMrr: number;
}

interface Props {
  admin: { email: string; name: string | null };
  stats: Stats;
  recentUsers: RecentUser[];
}

export default function AdminDashboard({ admin, stats, recentUsers }: Props) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await fetch("/api/auth/me", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200">
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-bold text-white">
              <span className="text-sky-400">Ride</span>ByWeather
            </Link>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[11px] font-medium text-amber-400">
              ADMIN
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-400 hidden sm:inline">{admin.email}</span>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-400">
            Welcome back{admin.name ? `, ${admin.name}` : ""}. Here's the latest activity.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
          <StatCard label="Total users" value={stats.totalUsers} />
          <StatCard label="New (7d)" value={stats.newUsers7d} accent="sky" />
          <StatCard label="Pro subs" value={stats.proSubs} accent="emerald" />
          <StatCard label="Enterprise subs" value={stats.enterpriseSubs} accent="purple" />
          <StatCard label="Routes saved" value={stats.totalRoutes} />
          <StatCard label="Est. MRR" value={`$${stats.estimatedMrr}`} accent="amber" />
        </div>

        {/* Recent users */}
        <section className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent users</h2>
            <span className="text-xs text-gray-500">Latest 25</span>
          </div>

          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-800">
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Tier</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {recentUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No users yet.
                    </td>
                  </tr>
                ) : (
                  recentUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-800/40">
                      <td className="px-4 py-3 text-gray-200">{u.email}</td>
                      <td className="px-4 py-3 text-gray-400">{u.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <TierBadge tier={u.subscription?.tier ?? "free"} />
                      </td>
                      <td className="px-4 py-3">
                        {u.role === "admin" ? (
                          <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[11px] text-amber-400">
                            admin
                          </span>
                        ) : (
                          <span className="text-gray-500 text-xs">user</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = "gray",
}: {
  label: string;
  value: number | string;
  accent?: "gray" | "sky" | "emerald" | "purple" | "amber";
}) {
  const accentClass = {
    gray: "text-white",
    sky: "text-sky-400",
    emerald: "text-emerald-400",
    purple: "text-purple-400",
    amber: "text-amber-400",
  }[accent];

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3">
      <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${accentClass}`}>{value}</div>
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const map: Record<string, string> = {
    free: "bg-gray-700/40 text-gray-300 border-gray-700",
    pro: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    enterprise: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${map[tier] ?? map.free}`}>
      {tier}
    </span>
  );
}
