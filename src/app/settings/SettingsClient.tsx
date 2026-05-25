"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StormAlertsToggle from "@/components/Notifications/StormAlertsToggle";

interface Prefs {
  preferredUnit: "imperial" | "metric";
  sport: "cycling" | "running";
  ebikeMode: boolean;
  preferCold: boolean;
  dislikeWind: boolean;
  temperatureMin: number | null;
  temperatureMax: number | null;
}

interface StravaStatus {
  configured: boolean;
  connected: boolean;
  athleteName?: string | null;
}

const DEFAULT: Prefs = {
  preferredUnit: "imperial",
  sport: "cycling",
  ebikeMode: false,
  preferCold: false,
  dislikeWind: false,
  temperatureMin: null,
  temperatureMax: null,
};

export default function SettingsClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SettingsInner />
    </Suspense>
  );
}

function SettingsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [strava, setStrava] = useState<StravaStatus>({ configured: false, connected: false });
  const [stravaMsg, setStravaMsg] = useState<string | null>(null);
  const [stravaLoading, setStravaLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(({ user }) => {
        if (!user) { router.push("/login"); return; }
        return fetch("/api/user/preferences");
      })
      .then((r) => r?.json())
      .then((data) => {
        if (data) setPrefs({ ...DEFAULT, ...data });
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch("/api/strava/status")
      .then((r) => r.json())
      .then(setStrava)
      .catch(() => {});

    const stravaParam = searchParams.get("strava");
    if (stravaParam === "connected") setStravaMsg("Strava connected successfully!");
    else if (stravaParam === "denied") setStravaMsg("Strava connection cancelled.");
    else if (stravaParam === "error") setStravaMsg("Strava connection failed. Please try again.");
  }, [router, searchParams]);

  async function handleStravaDisconnect() {
    setStravaLoading(true);
    try {
      await fetch("/api/strava/disconnect", { method: "DELETE" });
      setStrava((s) => ({ ...s, connected: false, athleteName: null }));
      setStravaMsg("Strava disconnected.");
    } finally {
      setStravaLoading(false);
    }
  }

  function set<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    setPrefs((p) => ({ ...p, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
    } catch {
      setError("Could not save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isFahrenheit = prefs.preferredUnit === "imperial";
  const tempUnit = isFahrenheit ? "°F" : "°C";

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-gray-400 mb-8 text-sm">
          Preferences affect your ride and run scores.
        </p>

        {/* Units */}
        <Section title="Units">
          <ToggleGroup
            label="Temperature &amp; speed"
            options={[
              { value: "imperial", label: "Imperial (°F / mph)" },
              { value: "metric", label: "Metric (°C / km/h)" },
            ]}
            value={prefs.preferredUnit}
            onChange={(v) => set("preferredUnit", v as Prefs["preferredUnit"])}
          />
        </Section>

        {/* Default Sport */}
        <Section title="Default Sport">
          <ToggleGroup
            label="Dashboard shown on home"
            options={[
              { value: "cycling", label: "Cycling" },
              { value: "running", label: "Running" },
            ]}
            value={prefs.sport}
            onChange={(v) => set("sport", v as Prefs["sport"])}
          />
        </Section>

        {/* Cycling-specific */}
        {prefs.sport === "cycling" && (
          <Section title="Cycling Options">
            <Toggle
              label="E-bike mode"
              description="Reduces wind penalty weighting — motor assists against headwinds"
              value={prefs.ebikeMode}
              onChange={(v) => set("ebikeMode", v)}
            />
          </Section>
        )}

        {/* Weather Comfort */}
        <Section title="Weather Comfort">
          <Toggle
            label="I prefer cooler temperatures"
            description="Scores warmer days lower, cooler days higher"
            value={prefs.preferCold}
            onChange={(v) => set("preferCold", v)}
          />
          <Toggle
            label="Wind bothers me"
            description="Increases wind weighting in your score"
            value={prefs.dislikeWind}
            onChange={(v) => set("dislikeWind", v)}
          />

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Comfortable temperature range ({tempUnit})
            </label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Min</label>
                <input
                  type="number"
                  placeholder={isFahrenheit ? "e.g. 45" : "e.g. 7"}
                  value={prefs.temperatureMin ?? ""}
                  onChange={(e) =>
                    set("temperatureMin", e.target.value === "" ? null : Number(e.target.value))
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
              <span className="text-gray-600 mt-5">–</span>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Max</label>
                <input
                  type="number"
                  placeholder={isFahrenheit ? "e.g. 80" : "e.g. 27"}
                  value={prefs.temperatureMax ?? ""}
                  onChange={(e) =>
                    set("temperatureMax", e.target.value === "" ? null : Number(e.target.value))
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Rides outside this range score lower. Leave blank to use defaults.
            </p>
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <StormAlertsToggle />
        </Section>

        {/* Connected Apps */}
        <Section title="Connected Apps">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-orange-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066l-2.084 4.116z" />
                <path d="M11.094 13.828l2.089 4.116 2.08-4.116H20.6L15.387 3 10.18 13.828h.914z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-200">Strava</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {!strava.configured
                    ? "Not configured — add STRAVA_CLIENT_ID to enable"
                    : strava.connected
                    ? `Connected${strava.athleteName ? ` as ${strava.athleteName}` : ""}`
                    : "Import your rides and runs as routes"}
                </p>
              </div>
            </div>
            {strava.configured && (
              strava.connected ? (
                <button
                  onClick={handleStravaDisconnect}
                  disabled={stravaLoading}
                  className="flex-shrink-0 text-sm px-4 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 disabled:opacity-50 transition-colors"
                >
                  {stravaLoading ? "…" : "Disconnect"}
                </button>
              ) : (
                <a
                  href="/api/strava/connect"
                  className="flex-shrink-0 text-sm px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-medium transition-colors"
                >
                  Connect
                </a>
              )
            )}
          </div>
          {stravaMsg && (
            <p className={`text-xs mt-2 ${stravaMsg.includes("success") ? "text-emerald-400" : "text-gray-400"}`}>
              {stravaMsg}
            </p>
          )}
        </Section>

        {/* Change password */}
        <Section title="Account">
          <ChangePasswordForm />
        </Section>

        {/* Save */}
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
          >
            {saving ? "Saving…" : "Save preferences"}
          </button>
          {saved && (
            <span className="text-emerald-400 text-sm flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
        {title}
      </h2>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        {children}
      </div>
    </div>
  );
}

function ToggleGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-sm text-gray-400 mb-2">{label}</p>
      <div className="flex rounded-lg overflow-hidden border border-gray-700 w-fit">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              value === opt.value
                ? "bg-sky-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (next.length < 8) {
      setMsg({ kind: "err", text: "New password must be at least 8 characters." });
      return;
    }
    if (next !== confirm) {
      setMsg({ kind: "err", text: "New passwords don't match." });
      return;
    }
    if (next === current) {
      setMsg({ kind: "err", text: "New password must be different from current." });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ kind: "err", text: data.error ?? "Could not update password." });
        return;
      }
      setMsg({ kind: "ok", text: "Password updated." });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch {
      setMsg({ kind: "err", text: "Network error. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Current password</label>
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          required
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">New password</label>
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="At least 8 characters"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm new password</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
        />
      </div>

      {msg && (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            msg.kind === "ok"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border border-red-500/30 text-red-400"
          }`}
        >
          {msg.text}
        </div>
      )}

      <button
        type="submit"
        disabled={busy || !current || !next || !confirm}
        className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg border border-gray-700 transition-colors"
      >
        {busy ? "Updating…" : "Change password"}
      </button>
    </form>
  );
}

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-200">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors mt-0.5 ${
          value ? "bg-sky-600" : "bg-gray-700"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            value ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
