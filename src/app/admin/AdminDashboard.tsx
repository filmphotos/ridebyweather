"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AdminUser {
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
  admin: { id?: string; email: string; name: string | null };
  stats: Stats;
  initialUsers: AdminUser[];
}

export default function AdminDashboard({ admin, stats, initialUsers }: Props) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(kind: "ok" | "err", text: string) {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 3500);
  }

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const url = new URL("/api/admin/users", window.location.origin);
        if (query.trim()) url.searchParams.set("q", query.trim());
        url.searchParams.set("limit", "50");
        const res = await fetch(url.toString());
        const data = await res.json();
        if (res.ok && Array.isArray(data.users)) {
          setUsers(data.users);
        }
      } catch {
        showToast("err", "Search failed.");
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function handleSignOut() {
    setSigningOut(true);
    await fetch("/api/auth/me", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  async function toggleRole(u: AdminUser) {
    const nextRole = u.role === "admin" ? "user" : "admin";
    const verb = nextRole === "admin" ? "Promote" : "Demote";
    if (!window.confirm(`${verb} ${u.email} to ${nextRole}?`)) return;

    setBusyId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast("err", data.error ?? "Could not update role.");
        return;
      }
      setUsers((arr) => arr.map((x) => (x.id === u.id ? { ...x, role: nextRole } : x)));
      showToast("ok", `${u.email} is now ${nextRole}.`);
    } catch {
      showToast("err", "Network error.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteUser(u: AdminUser) {
    if (
      !window.confirm(
        `Delete ${u.email}? This removes their account, routes, and subscription record. This cannot be undone.`
      )
    )
      return;

    setBusyId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast("err", data.error ?? "Could not delete user.");
        return;
      }
      setUsers((arr) => arr.filter((x) => x.id !== u.id));
      showToast("ok", `${u.email} deleted.`);
    } catch {
      showToast("err", "Network error.");
    } finally {
      setBusyId(null);
    }
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

        {/* Users panel */}
        <section className="card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-white">Users</h2>
            <div className="relative w-full sm:w-72">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by email or name…"
                className="w-full rounded-lg bg-gray-800 border border-gray-700 pl-9 pr-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500 transition-colors"
              />
              <svg
                className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                  clipRule="evenodd"
                />
              </svg>
              {searching && (
                <div className="absolute right-2.5 top-2.5 h-4 w-4 border-2 border-gray-600 border-t-sky-500 rounded-full animate-spin" />
              )}
            </div>
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
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      {query ? "No users match that search." : "No users yet."}
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isSelf = admin.id === u.id;
                    const isAdmin = u.role === "admin";
                    const busy = busyId === u.id;
                    return (
                      <tr key={u.id} className="hover:bg-gray-800/40">
                        <td className="px-4 py-3 text-gray-200">{u.email}</td>
                        <td className="px-4 py-3 text-gray-400">{u.name ?? "—"}</td>
                        <td className="px-4 py-3">
                          <TierBadge tier={u.subscription?.tier ?? "free"} />
                        </td>
                        <td className="px-4 py-3">
                          {isAdmin ? (
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
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => toggleRole(u)}
                              disabled={busy || (isSelf && isAdmin)}
                              title={
                                isSelf && isAdmin
                                  ? "You can't demote yourself"
                                  : isAdmin
                                  ? "Demote to user"
                                  : "Promote to admin"
                              }
                              className="rounded-md border border-gray-700 px-2 py-1 text-[11px] text-gray-300 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              {busy ? "…" : isAdmin ? "Demote" : "Promote"}
                            </button>
                            <button
                              onClick={() => deleteUser(u)}
                              disabled={busy || isSelf}
                              title={isSelf ? "You can't delete yourself" : "Delete user"}
                              className="rounded-md border border-red-500/30 px-2 py-1 text-[11px] text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {toast && (
          <div
            className={`fixed bottom-6 right-6 rounded-lg px-4 py-2.5 text-sm shadow-lg border ${
              toast.kind === "ok"
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                : "bg-red-500/15 border-red-500/30 text-red-300"
            }`}
          >
            {toast.text}
          </div>
        )}
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
