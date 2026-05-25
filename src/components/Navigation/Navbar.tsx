"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Cycling", href: "/cycling" },
  { label: "Ride", href: "/ride" },
  { label: "Running", href: "/running" },
  { label: "Group Rides", href: "/group-rides" },
  { label: "E-Bike Laws", href: "/ebike-laws" },
  { label: "Pricing", href: "/pricing" },
];

interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  role?: string | null;
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
  const isAdmin = user?.role === "admin";

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close mobile nav on route change
  useEffect(() => { setMobileNavOpen(false); }, [pathname]);

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg sm:text-xl text-white shrink-0">
          <svg className="h-6 w-6 sm:h-7 sm:w-7 text-sky-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
          </svg>
          <span>
            <span className="text-sky-400">Ride</span>
            <span className="text-white">ByWeather</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1">
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
        <div className="flex items-center gap-1">
        {user ? (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg px-2 sm:px-3 py-2 hover:bg-gray-800 transition-colors"
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
              {isAdmin && (
                <span className="inline-flex items-center rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400 uppercase tracking-wide">
                  Admin
                </span>
              )}
              {isPaid && !isAdmin && (
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
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {isAdmin && (
                      <span className="inline-flex items-center rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400 uppercase tracking-wide">
                        Admin
                      </span>
                    )}
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

                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-amber-400 hover:bg-gray-800 transition-colors border-b border-gray-800"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.243 3.03a1 1 0 01.514 1.397L8.06 7H17a1 1 0 010 2h-2v3h2a1 1 0 110 2h-2v3a1 1 0 11-2 0v-3h-3v3a1 1 0 11-2 0v-3H5a1 1 0 110-2h2.06l1.74-3.566A1 1 0 019.243 3.03zM11 12h2V9h-2v3z" />
                    </svg>
                    Admin dashboard
                  </Link>
                )}

                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 transition-colors border-b border-gray-800"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                  Settings
                </Link>

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
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="hidden sm:inline text-sm text-gray-400 hover:text-gray-100 transition-colors">
              Log in
            </Link>
            <Link href="/signup" className="btn-primary text-sm px-3 sm:px-4 py-2 whitespace-nowrap">
              Get Started
            </Link>
          </div>
        )}

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileNavOpen((o) => !o)}
          aria-label="Toggle navigation"
          className="md:hidden ml-1 rounded-lg p-2 text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors"
        >
          {mobileNavOpen ? (
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 012 10z" clipRule="evenodd" />
            </svg>
          )}
        </button>
        </div>
      </div>

      {/* Mobile nav panel */}
      {mobileNavOpen && (
        <div className="md:hidden border-t border-gray-800 bg-gray-950/95 backdrop-blur">
          <div className="px-4 py-3 flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname?.startsWith(item.href)
                    ? "bg-sky-500/20 text-sky-400"
                    : "text-gray-300 hover:text-white hover:bg-gray-800"
                )}
              >
                {item.label}
              </Link>
            ))}
            {!user && (
              <Link
                href="/login"
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors sm:hidden"
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
