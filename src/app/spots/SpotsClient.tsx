"use client";

import { useCallback, useEffect, useState } from "react";
import LocationSearch, { type PickedLocation } from "@/components/LocationSearch/LocationSearch";
import ProBadge from "@/components/Pro/ProBadge";
import ProPaywall from "@/components/Pro/ProPaywall";

interface Spot {
  id: string;
  name: string;
  locationName: string | null;
  lat: number;
  lng: number;
  sport: string;
}

interface Window {
  startHourLocal: number;
  endHourLocal: number;
  avgScore: number;
  scoreLabel: string;
  startsTomorrow: boolean;
  weather: {
    tempF: number;
    windSpeedMph: number;
    condition: string;
  };
}

interface Ranking {
  spot: Spot;
  window: Window | null;
  error?: string;
}

type Tier = "free" | "pro" | "enterprise";

function fmtHour12(h: number): string {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}

function scoreColor(score: number): string {
  if (score >= 9.5) return "#22c55e";
  if (score >= 8) return "#4ade80";
  if (score >= 6) return "#facc15";
  if (score >= 5) return "#eab308";
  if (score >= 3) return "#f97316";
  return "#f87171";
}

export default function SpotsClient() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [tier, setTier] = useState<Tier>("free");
  const [limit, setLimit] = useState<number | null>(1);
  const [pendingPick, setPendingPick] = useState<PickedLocation | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paywallReason, setPaywallReason] = useState<string | null>(null);
  const [rankings, setRankings] = useState<Ranking[] | null>(null);
  const [scanning, setScanning] = useState(false);

  const loadSpots = useCallback(async () => {
    try {
      const res = await fetch("/api/ride-spots");
      if (!res.ok) return;
      const data = await res.json();
      setSpots(data.spots ?? []);
      setTier(data.tier ?? "free");
      setLimit(data.limit);
    } catch {
      // ignore — UI shows the empty state until reload
    }
  }, []);

  useEffect(() => {
    loadSpots();
  }, [loadSpots]);

  async function addSpot() {
    if (!pendingPick) return;
    setBusy(true);
    setError(null);
    setPaywallReason(null);
    try {
      const res = await fetch("/api/ride-spots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || pendingPick.name?.split(",")[0] || "New spot",
          lat: pendingPick.lat,
          lng: pendingPick.lng,
          locationName: pendingPick.name ?? null,
        }),
      });
      if (res.status === 402) {
        const data = await res.json();
        setPaywallReason(
          `Free includes ${data.limit} spot — Pro lets you save up to 10 and rank them by best riding window.`
        );
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not save spot");
        return;
      }
      setPendingPick(null);
      setName("");
      await loadSpots();
    } finally {
      setBusy(false);
    }
  }

  async function removeSpot(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/ride-spots/${id}`, { method: "DELETE" });
      if (res.ok) {
        // Also drop it from the current rankings so the UI updates instantly.
        setRankings((r) => r?.filter((x) => x.spot.id !== id) ?? null);
        await loadSpots();
      }
    } finally {
      setBusy(false);
    }
  }

  async function scan() {
    if (spots.length === 0) return;
    setScanning(true);
    setError(null);
    try {
      const res = await fetch("/api/ride-spots/scan");
      if (!res.ok) {
        setError("Scan failed");
        return;
      }
      const data = await res.json();
      setRankings(data.rankings ?? []);
    } finally {
      setScanning(false);
    }
  }

  const atLimit = limit !== null && spots.length >= limit;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-white">Where Should I Ride?</h1>
          {tier === "free" && <ProBadge />}
        </div>
        <p className="mt-1 max-w-2xl text-sm text-gray-400">
          Save the places you actually ride from — home, the trailhead, the cabin —
          then run a scan to see where tomorrow&apos;s riding will be best.
        </p>
      </div>

      {/* Add a spot */}
      <div className="card mb-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs uppercase tracking-wide text-gray-500" htmlFor="spot-name">
                Spot name
              </label>
              <input
                id="spot-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='e.g. "Home", "Lake Loop"'
                maxLength={80}
                className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-2">
            <div className="flex-1">
              <label className="text-xs uppercase tracking-wide text-gray-500">
                Location
              </label>
              <div className="mt-1">
                <LocationSearch
                  onSelect={(loc) => setPendingPick(loc)}
                  autoDetect={false}
                  placeholder="City, address, or ZIP…"
                />
              </div>
            </div>
            <button
              onClick={addSpot}
              disabled={!pendingPick || busy || atLimit}
              className="btn-primary whitespace-nowrap rounded-lg px-4 py-2 text-sm disabled:opacity-40"
            >
              {atLimit ? "Limit reached" : "Save spot"}
            </button>
          </div>
          {pendingPick && (
            <p className="text-xs text-gray-500">
              Ready: <span className="text-gray-300">{pendingPick.name ?? "Selected location"}</span>
            </p>
          )}
          {limit !== null && (
            <p className="text-xs text-gray-500">
              {spots.length} of {limit} spot{limit === 1 ? "" : "s"} used
              {tier === "free" && (
                <>
                  {" "}— Pro lets you save up to 10.{" "}
                  <a href="/pricing" className="text-amber-300 hover:underline">
                    Upgrade
                  </a>
                </>
              )}
            </p>
          )}
          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Paywall shown after a 402 from the API */}
      {paywallReason && (
        <div className="mb-6">
          <ProPaywall
            feature="Save more ride spots"
            description="Rank your favorite places by today's best riding window — wherever conditions are best, that's where you go."
            limitLine={paywallReason}
          />
        </div>
      )}

      {/* Saved spots + scan button */}
      {spots.length > 0 && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Your spots
            </h2>
            <button
              onClick={scan}
              disabled={scanning}
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-40"
            >
              {scanning ? "Scanning…" : rankings ? "Rescan" : "Scan all"}
            </button>
          </div>
          <ul className="space-y-2">
            {spots.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-100 truncate">{s.name}</div>
                  {s.locationName && (
                    <div className="text-xs text-gray-500 truncate">{s.locationName}</div>
                  )}
                </div>
                <button
                  onClick={() => removeSpot(s.id)}
                  disabled={busy}
                  className="ml-3 rounded p-1 text-gray-500 hover:bg-gray-800 hover:text-red-400 disabled:opacity-40"
                  aria-label="Remove spot"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ranked scan results */}
      {rankings && rankings.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4">
            Ranked by best ride window
          </h2>
          <ol className="space-y-3">
            {rankings.map((r, i) => (
              <li
                key={r.spot.id}
                className="rounded-xl border border-gray-800 bg-gray-900/40 p-4"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      i === 0 ? "bg-amber-500/20 text-amber-300" : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white">{r.spot.name}</span>
                      {i === 0 && r.window && (
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                          Top pick
                        </span>
                      )}
                    </div>
                    {r.spot.locationName && (
                      <div className="mt-0.5 text-xs text-gray-500 truncate">{r.spot.locationName}</div>
                    )}
                    {r.window ? (
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                        <span
                          className="rounded-md px-2 py-1 text-sm font-bold tabular-nums"
                          style={{
                            backgroundColor: `${scoreColor(r.window.avgScore)}22`,
                            color: scoreColor(r.window.avgScore),
                          }}
                        >
                          {r.window.avgScore.toFixed(1)}
                        </span>
                        <span className="text-gray-400">
                          {r.window.startsTomorrow ? "Tomorrow" : "Today"}{" "}
                          {fmtHour12(r.window.startHourLocal)}–{fmtHour12(r.window.endHourLocal)}
                        </span>
                        <span className="text-gray-500">
                          {Math.round(r.window.weather.tempF)}°F · {Math.round(r.window.weather.windSpeedMph)} mph wind · {r.window.weather.condition}
                        </span>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-gray-500">No good window in the next 36 hours.</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {spots.length === 0 && !paywallReason && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="text-5xl">📍</div>
          <p className="max-w-md text-gray-400">
            Add a spot to get started. Name it something memorable like &quot;Home&quot; or &quot;Lake Loop&quot;.
          </p>
        </div>
      )}
    </div>
  );
}
