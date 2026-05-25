import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getAdminFromCookies } from "@/lib/admin";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "User detail — RideByWeather Admin" };
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const admin = await getAdminFromCookies();
  if (!admin) redirect("/admin/login");

  const { id } = await params;

  const [user, routeCount, scoreCount, recentRoutes, recentScores] = await Promise.all([
    db.user.findUnique({
      where: { id },
      include: {
        subscription: true,
        preferences: true,
        deviceIntegrations: { select: { provider: true, createdAt: true } },
      },
    }),
    db.route.count({ where: { userId: id } }),
    db.rideScoreHistory.count({ where: { userId: id } }),
    db.route.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        sport: true,
        distance: true,
        elevationGain: true,
        createdAt: true,
      },
    }),
    db.rideScoreHistory.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        sport: true,
        score: true,
        label: true,
        lat: true,
        lng: true,
        timestamp: true,
      },
    }),
  ]);

  if (!user) notFound();

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
          <Link
            href="/admin"
            className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 transition-colors"
          >
            ← Back to dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Profile header */}
        <section className="card mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-white">
                  {user.name ?? user.email}
                </h1>
                {user.role === "admin" && (
                  <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[11px] font-bold text-amber-400 uppercase tracking-wide">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400">{user.email}</p>
              <p className="mt-2 text-xs text-gray-500">
                Joined {new Date(user.createdAt).toLocaleDateString(undefined, { dateStyle: "long" })}
                {" · "}
                Updated {new Date(user.updatedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="text-xs text-gray-500 text-right font-mono">
              ID<br />
              <span className="text-gray-400">{user.id}</span>
            </div>
          </div>
        </section>

        {/* Stat strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Stat label="Subscription" value={user.subscription?.tier ?? "free"} accent="amber" />
          <Stat label="Status" value={user.subscription?.status ?? "—"} />
          <Stat label="Routes saved" value={routeCount} accent="sky" />
          <Stat label="Ride score lookups" value={scoreCount} accent="emerald" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Subscription */}
          <section className="card">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
              Subscription
            </h2>
            {user.subscription ? (
              <dl className="text-sm space-y-2">
                <Row label="Tier" value={user.subscription.tier} />
                <Row label="Status" value={user.subscription.status} />
                <Row
                  label="Stripe customer"
                  value={user.subscription.stripeCustomerId ?? "—"}
                  mono
                />
                <Row
                  label="Stripe subscription"
                  value={user.subscription.stripeSubscriptionId ?? "—"}
                  mono
                />
                <Row
                  label="Renews / ends"
                  value={
                    user.subscription.currentPeriodEnd
                      ? new Date(user.subscription.currentPeriodEnd).toLocaleString()
                      : "—"
                  }
                />
              </dl>
            ) : (
              <p className="text-sm text-gray-500">No subscription record.</p>
            )}
          </section>

          {/* Preferences */}
          <section className="card">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
              Preferences
            </h2>
            {user.preferences ? (
              <dl className="text-sm space-y-2">
                <Row label="Units" value={user.preferences.preferredUnit} />
                <Row label="Sport" value={user.preferences.sport} />
                <Row label="E-bike" value={user.preferences.ebikeMode ? "yes" : "no"} />
                <Row label="Prefers cold" value={user.preferences.preferCold ? "yes" : "no"} />
                <Row label="Wind sensitive" value={user.preferences.dislikeWind ? "yes" : "no"} />
                <Row
                  label="Temp range"
                  value={
                    user.preferences.temperatureMin != null ||
                    user.preferences.temperatureMax != null
                      ? `${user.preferences.temperatureMin ?? "—"} to ${user.preferences.temperatureMax ?? "—"}`
                      : "default"
                  }
                />
              </dl>
            ) : (
              <p className="text-sm text-gray-500">No preferences saved (using defaults).</p>
            )}
          </section>

          {/* Recent routes */}
          <section className="card lg:col-span-2">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
              Recent routes ({routeCount} total)
            </h2>
            {recentRoutes.length === 0 ? (
              <p className="text-sm text-gray-500">No routes saved yet.</p>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-800">
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Sport</th>
                      <th className="px-3 py-2 font-medium">Distance</th>
                      <th className="px-3 py-2 font-medium">Elevation</th>
                      <th className="px-3 py-2 font-medium">Saved</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {recentRoutes.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-800/40">
                        <td className="px-3 py-2 text-gray-200">{r.name}</td>
                        <td className="px-3 py-2 text-gray-400">{r.sport}</td>
                        <td className="px-3 py-2 text-gray-400">{r.distance.toFixed(1)} mi</td>
                        <td className="px-3 py-2 text-gray-400">{r.elevationGain.toFixed(0)} ft</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Recent ride score lookups */}
          <section className="card lg:col-span-2">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
              Recent ride scores ({scoreCount} total)
            </h2>
            {recentScores.length === 0 ? (
              <p className="text-sm text-gray-500">No ride score lookups yet.</p>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-800">
                      <th className="px-3 py-2 font-medium">Score</th>
                      <th className="px-3 py-2 font-medium">Label</th>
                      <th className="px-3 py-2 font-medium">Sport</th>
                      <th className="px-3 py-2 font-medium">Location</th>
                      <th className="px-3 py-2 font-medium">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {recentScores.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-800/40">
                        <td className="px-3 py-2">
                          <ScoreBadge score={s.score} />
                        </td>
                        <td className="px-3 py-2 text-gray-300">{s.label}</td>
                        <td className="px-3 py-2 text-gray-400">{s.sport}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs font-mono">
                          {s.lat.toFixed(3)}, {s.lng.toFixed(3)}
                        </td>
                        <td className="px-3 py-2 text-gray-500 text-xs">
                          {new Date(s.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Device integrations */}
          {user.deviceIntegrations.length > 0 && (
            <section className="card lg:col-span-2">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
                Connected devices
              </h2>
              <ul className="text-sm space-y-1">
                {user.deviceIntegrations.map((d, i) => (
                  <li key={i} className="text-gray-400">
                    <span className="text-gray-200 capitalize">{d.provider}</span>{" "}
                    <span className="text-xs text-gray-500">
                      — connected {new Date(d.createdAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = "gray",
}: {
  label: string;
  value: number | string;
  accent?: "gray" | "sky" | "emerald" | "amber";
}) {
  const accentClass = {
    gray: "text-white",
    sky: "text-sky-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
  }[accent];
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3">
      <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`mt-1 text-xl font-bold capitalize ${accentClass}`}>{value}</div>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className={`text-gray-300 text-right truncate ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 8
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
      : score >= 6
      ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
      : score >= 4
      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
      : "bg-red-500/20 text-red-300 border-red-500/30";
  return (
    <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-bold ${color}`}>
      {score.toFixed(1)}
    </span>
  );
}
