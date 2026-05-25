"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Invalid credentials.");
        return;
      }

      const check = await fetch("/api/admin/me", { cache: "no-store" });
      const checkData = await check.json();

      if (!check.ok || !checkData.admin) {
        await fetch("/api/auth/me", { method: "DELETE" });
        setError("This account does not have admin access.");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold text-white">
            <span className="text-sky-400">Ride</span>
            <span>ByWeather</span>
          </Link>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 px-3 py-1 text-xs font-medium text-amber-400">
            ADMIN AREA
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white">Admin sign in</h1>
          <p className="mt-1 text-sm text-gray-400">
            Restricted to RideByWeather administrators.
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Admin email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ridebyweather.com"
                required
                autoComplete="email"
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 mt-2 !bg-amber-500 hover:!bg-amber-400 !text-gray-950"
            >
              {loading ? "Verifying…" : "Sign in to admin"}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-gray-800 text-center text-sm text-gray-500">
            Not an admin?{" "}
            <Link href="/login" className="text-sky-400 hover:text-sky-300 font-medium">
              User sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
