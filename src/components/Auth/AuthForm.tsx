"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface AuthFormProps {
  mode: "login" | "signup";
  plan?: string;
}

export default function AuthForm({ mode, plan }: AuthFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = isSignup ? "/api/auth/register" : "/api/auth/login";
      const body = isSignup ? { name, email, password } : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = typeof data.error === "string"
          ? data.error
          : "Something went wrong. Please try again.";
        setError(msg);
        return;
      }

      // Redirect to cycling dashboard (or checkout if upgrading)
      if (plan === "pro") {
        router.push("/cycling?welcome=pro");
      } else if (plan === "enterprise") {
        router.push("/cycling?welcome=enterprise");
      } else {
        router.push("/cycling");
      }
      router.refresh();
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold text-white">
            <span className="text-sky-400">Ride</span>
            <span>ByWeather</span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-white">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            {isSignup
              ? "Start checking Ride Scores for free"
              : "Sign in to your RideByWeather account"}
          </p>
          {plan && isSignup && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 border border-sky-500/30 px-3 py-1 text-xs text-sky-400">
              <span>✓</span> Starting {plan === "pro" ? "Pro" : "Enterprise"} plan
            </div>
          )}
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Name <span className="text-gray-600">(optional)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>
            )}

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

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignup ? "At least 8 characters" : "Your password"}
                required
                minLength={isSignup ? 8 : 1}
                autoComplete={isSignup ? "new-password" : "current-password"}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500 transition-colors"
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
              className="btn-primary w-full py-3 mt-2"
            >
              {loading
                ? "Please wait…"
                : isSignup
                ? "Create account"
                : "Sign in"}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-gray-800 text-center text-sm">
            {isSignup ? (
              <span className="text-gray-400">
                Already have an account?{" "}
                <Link href="/login" className="text-sky-400 hover:text-sky-300 font-medium">
                  Sign in
                </Link>
              </span>
            ) : (
              <span className="text-gray-400">
                No account yet?{" "}
                <Link href="/signup" className="text-sky-400 hover:text-sky-300 font-medium">
                  Create one free
                </Link>
              </span>
            )}
          </div>
        </div>

        {isSignup && (
          <p className="mt-4 text-center text-xs text-gray-600">
            By signing up you agree to our Terms of Service and Privacy Policy.
          </p>
        )}
      </div>
    </div>
  );
}
