"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Phase = "checking" | "needLogin" | "ready" | "approving" | "done" | "error";

export default function DeviceLink() {
  const params = useSearchParams();
  const urlCode = (params.get("code") ?? "").trim().toUpperCase();

  const [typed, setTyped] = useState("");
  const [confirmed, setConfirmed] = useState("");
  const code = urlCode || confirmed;

  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        setPhase(d?.user ? "ready" : "needLogin");
      })
      .catch(() => active && setPhase("needLogin"));
    return () => {
      active = false;
    };
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      setPhase("ready");
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d?.error ?? "Login failed");
    }
  }

  async function handleApprove() {
    setPhase("approving");
    setError(null);
    const res = await fetch("/api/device/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (res.ok) {
      setPhase("done");
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d?.error ?? "Approval failed");
      setPhase("error");
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-sky-400">RideByWeather</h1>
          <p className="text-gray-400 text-sm mt-1">Connect your device</p>
        </div>

        {!code && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <p className="text-center text-gray-300 text-sm mb-3">
              Enter the code shown on your device
            </p>
            <input
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              placeholder="e.g. WTQB38"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2.5 text-center text-xl font-mono tracking-widest text-gray-100 placeholder-gray-500 focus:border-sky-500 focus:outline-none"
            />
            <button
              onClick={() => setConfirmed(typed.trim().toUpperCase())}
              className="mt-3 w-full rounded-lg bg-sky-600 hover:bg-sky-500 py-2.5 font-semibold transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {code && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <p className="text-center text-gray-400 text-sm">Device code</p>
            <p className="text-center text-3xl font-mono font-bold tracking-widest mt-1 mb-5">
              {code}
            </p>

            {phase === "checking" && (
              <div className="flex justify-center py-4">
                <div className="w-7 h-7 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {phase === "needLogin" && (
              <form onSubmit={handleLogin} className="space-y-3">
                <p className="text-sm text-gray-300 text-center mb-2">Log in to approve</p>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2.5 text-gray-100 placeholder-gray-500 focus:border-sky-500 focus:outline-none"
                />
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2.5 text-gray-100 placeholder-gray-500 focus:border-sky-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="w-full rounded-lg bg-sky-600 hover:bg-sky-500 py-2.5 font-semibold transition-colors"
                >
                  Log in
                </button>
              </form>
            )}

            {phase === "ready" && (
              <button
                onClick={handleApprove}
                className="w-full rounded-lg bg-sky-600 hover:bg-sky-500 py-3 font-semibold transition-colors"
              >
                Approve this device
              </button>
            )}

            {phase === "approving" && (
              <div className="flex justify-center py-4">
                <div className="w-7 h-7 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {phase === "done" && (
              <div className="text-center">
                <div className="text-4xl mb-2">✅</div>
                <p className="font-semibold">Device approved</p>
                <p className="text-gray-400 text-sm mt-1">
                  Return to your device — it&apos;ll sign in within a few seconds.
                </p>
              </div>
            )}

            {phase === "error" && (
              <div className="text-center">
                <p className="text-rose-400 font-semibold">{error ?? "Something went wrong"}</p>
                <p className="text-gray-400 text-sm mt-1">
                  The code may have expired — start again on the device.
                </p>
              </div>
            )}

            {error && phase !== "error" && (
              <p className="text-rose-400 text-sm text-center mt-3">{error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
