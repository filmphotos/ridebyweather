"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error. Please check your connection.");
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
          <h1 className="mt-4 text-2xl font-bold text-white">Forgot your password?</h1>
          <p className="mt-1 text-sm text-gray-400">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <div className="card">
          {submitted ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-sky-500/10 border border-sky-500/30 px-4 py-3 text-sm text-sky-300">
                If an account exists for <span className="font-medium">{email}</span>, a reset link
                is on its way. Check your inbox (and spam folder).
              </div>
              <p className="text-xs text-gray-500">
                The link expires in 1 hour. Didn&apos;t get it?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                  }}
                  className="text-sky-400 hover:text-sky-300 font-medium"
                >
                  Try again
                </button>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-sm text-red-400">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}

          <div className="mt-5 pt-5 border-t border-gray-800 text-center text-sm">
            <span className="text-gray-400">
              Remember your password?{" "}
              <Link href="/login" className="text-sky-400 hover:text-sky-300 font-medium">
                Sign in
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
