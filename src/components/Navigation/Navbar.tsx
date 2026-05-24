"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Cycling", href: "/cycling" },
  { label: "Running", href: "/running" },
  { label: "Pricing", href: "/pricing" },
];

interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tier, setTier] = useState<string>("free");
  const [menuOpen, setMenuOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user ?? null);
        setTier(d.tier ?? "free");
      })
      .catch(() => {});
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/me", { method: "DELETE" });
    setUser(null);
    setTier("free");
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // silently fail
    } finally {
      setPortalLoading(false);
    }
  }

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "?";

  const isPaid = tier === "pro" || tier === "enterprise";

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white">
          <svg className="h-7 w-7 text-sky-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
          </svg>
          <span>
            <span className="text-sky-400">Ride</span>
            <span className="text-white">ByWeather</span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                pathname?.startsWith(item.href)
                  ? "bg-sky-500/20 text-sky-400"
                  : "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Auth area */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-800 transition-colors"
            >
              <div className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white",
                isPaid ? "bg-gradient-to-br from-sky-500 to-indigo-600" : "bg-sky-600"
              )}>
                {initials}
              </div>
              <span className="text-sm text-gray-200 max-w-[100px] truncate hidden sm:block">
                {user.name ?? user.email}
              </span>
              {isPaid && (
                <span className="hidden sm:inline-flex items-center rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-400 uppercase tracking-wide">
                  {tier}
                </span>
              )}
              <svg className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-1 w-52 rounded-xl border border-gray-800 bg-gray-900 shadow-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-800">
                  <p className="text-xs font-medium text-gray-300 truncate">{user.name ?? user.email}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  <div className="mt-1.5">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      isPaid
                        ? "bg-sky-500/20 text-sky-400"
                        : "bg-gray-800 text-gray-500"
                    )}>
                      {tier} plan
                    </span>
                  </div>
                </div>

                {!isPaid && (
                  <Link
                    href="/pricing"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-sky-400 hover:bg-gray-800 transition-colors border-b border-gray-800"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    Upgrade to Pro
                  </Link>
                )}

                {isPaid && (
                  <button
                    onClick={() => { setMenuOpen(false); handleManageBilling(); }}
                    disabled={portalLoading}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-800 transition-colors border-b border-gray-800 disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2.5 4A1.5 1.5 0 001 5.5v1A1.5 1.5 0 002.5 8h15A1.5 1.5 0 0019 6.5v-1A1.5 1.5 0 0017.5 4h-15zM1 11.5A1.5 1.5 0 012.5 10h15a1.5 1.5 0 010 3h-15A1.5 1.5 0 011 11.5zM2.5 16a1.5 1.5 0 000 3h10a1.5 1.5 0 000-3h-10z" />
                    </svg>
                    {portalLoading ? "Opening…" : "Manage billing"}
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-red-400 transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-400 hover:text-gray-100 transition-colors">
              Log in
            </Link>
            <Link href="/signup" className="btn-primary text-sm px-4 py-2">
              Get Started
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
