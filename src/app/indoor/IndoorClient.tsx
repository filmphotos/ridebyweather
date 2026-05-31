"use client";

import { useCallback, useEffect, useState } from "react";
import LocationSearch, { type PickedLocation } from "@/components/LocationSearch/LocationSearch";
import {
  pickWorkouts,
  toZwoXml,
  wattsAt,
  type Segment,
  type Workout,
} from "@/lib/indoorWorkouts";

const KIND_COLOR: Record<Workout["kind"], string> = {
  recovery: "#22c55e",
  endurance: "#84cc16",
  "sweet-spot": "#f59e0b",
  intervals: "#f97316",
  vo2: "#ef4444",
};

export default function IndoorClient() {
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [duration, setDuration] = useState(60);
  const [score, setScore] = useState<number | null>(null);
  const [picks, setPicks] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ftp, setFtp] = useState<number | null>(null);
  const [ftpDraft, setFtpDraft] = useState("");
  const [ftpSaving, setFtpSaving] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("rbw_indoor_duration");
      if (raw) setDuration(Number(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("rbw_indoor_duration", String(duration)); } catch {}
  }, [duration]);

  // Pull FTP from the user's preferences so the watt targets stay in sync
  // with the Settings page.
  useEffect(() => {
    fetch("/api/user/preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.ftpWatts === "number") {
          setFtp(data.ftpWatts);
          setFtpDraft(String(data.ftpWatts));
        }
      })
      .catch(() => {});
  }, []);

  async function saveFtp() {
    const n = Number(ftpDraft);
    if (!Number.isFinite(n) || n <= 0) return;
    setFtpSaving(true);
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ftpWatts: Math.round(n) }),
      });
      if (res.ok) setFtp(Math.round(n));
    } finally {
      setFtpSaving(false);
    }
  }

  const load = useCallback(async (loc: PickedLocation) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ride-score?lat=${loc.lat}&lng=${loc.lng}`);
      if (!res.ok) throw new Error("Failed to load conditions");
      const json = await res.json();
      setScore(json.score);
      setPicks(pickWorkouts(duration, json.score));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [duration]);

  const handleSelect = useCallback(
    (loc: PickedLocation) => {
      setLocation(loc);
      load(loc);
    },
    [load]
  );

  useEffect(() => {
    if (score != null) setPicks(pickWorkouts(duration, score));
  }, [duration, score]);

  function downloadZwo(w: Workout) {
    const xml = toZwoXml(w);
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${w.id}-${w.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.zwo`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Indoor Training</h1>
          <p className="mt-1 text-sm text-gray-400 max-w-xl">
            Outdoor conditions look rough? Match a structured trainer workout to your planned
            ride. Download a .zwo file for Zwift, TrainerRoad, or MyWhoosh.
          </p>
          {location?.name && <p className="mt-1 text-sm text-gray-500">{location.name}</p>}
        </div>
        <LocationSearch onSelect={handleSelect} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card">
          <label className="flex items-center justify-between text-sm text-gray-300">
            <span>Planned ride duration</span>
            <span className="font-semibold text-white tabular-nums">{duration} min</span>
          </label>
          <input
            type="range"
            min={30}
            max={150}
            step={15}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="mt-2 w-full accent-sky-500"
          />
          <p className="mt-1 text-[11px] text-gray-500">We pick workouts within ±25% of this.</p>
        </div>

        <div className="card">
          <label className="block text-sm text-gray-300">FTP (watts)</label>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={50}
              max={2000}
              placeholder="e.g. 220"
              value={ftpDraft}
              onChange={(e) => setFtpDraft(e.target.value)}
              className="w-32 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-sky-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={saveFtp}
              disabled={ftpSaving || !ftpDraft || Number(ftpDraft) === ftp}
              className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {ftpSaving ? "Saving…" : ftp ? "Update" : "Save"}
            </button>
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            {ftp
              ? "Power targets are shown in watts below."
              : "Set your FTP to see watt targets. Otherwise targets are shown as % FTP."}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">{error}</div>
      )}
      {loading && <div className="card h-48 animate-pulse bg-gray-800" />}

      {!loading && score != null && (
        <div className="mb-4 card">
          <div className="text-sm text-gray-300">
            Outdoor score: <span className="font-bold text-white">{score.toFixed(1)}</span>.{" "}
            {score < 5
              ? "Indoor is the smart call today."
              : "Conditions are actually fine — these are alternatives if you want indoor anyway."}
          </div>
        </div>
      )}

      {!loading && picks.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {picks.map((w) => (
            <div key={w.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                      style={{ backgroundColor: KIND_COLOR[w.kind] + "33", color: KIND_COLOR[w.kind] }}
                    >
                      {w.kind}
                    </span>
                    <h3 className="text-lg font-semibold text-white">{w.name}</h3>
                  </div>
                  <p className="mt-2 text-sm text-gray-300">{w.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs uppercase tracking-wide text-gray-500">Time</div>
                  <div className="text-xl font-bold text-white tabular-nums">{w.durationMin}m</div>
                  <div className="mt-2 text-xs uppercase tracking-wide text-gray-500">TSS</div>
                  <div className="text-base font-bold text-sky-400 tabular-nums">{w.tss}</div>
                </div>
              </div>

              <SegmentList segments={w.segments} ftp={ftp} />

              <div className="mt-4 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => downloadZwo(w)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-gray-700"
                  title="Zwift / TrainerRoad / MyWhoosh compatible"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  Download .zwo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && score == null && !error && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="text-6xl">🏠</div>
          <p className="text-gray-400">Pick a location to find an indoor session.</p>
        </div>
      )}
    </div>
  );
}

function SegmentList({ segments, ftp }: { segments: Segment[]; ftp: number | null }) {
  return (
    <ul className="mt-4 space-y-1 border-t border-gray-800 pt-3 text-xs text-gray-300">
      {segments.map((s, i) => (
        <li key={i} className="flex items-baseline justify-between gap-3">
          <span className="text-gray-400">{formatSegmentLine(s)}</span>
          <span className="font-mono tabular-nums text-gray-200">{formatPower(s, ftp)}</span>
        </li>
      ))}
    </ul>
  );
}

function formatSegmentLine(s: Segment): string {
  const main = formatDuration(s.sec);
  if (s.repeat && s.repeat > 1 && s.offSec) {
    return `${s.label} — ${s.repeat} × ${main} on / ${formatDuration(s.offSec)} off`;
  }
  return `${s.label} — ${main}`;
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.round(sec / 60);
  return `${m} min`;
}

function formatPower(s: Segment, ftp: number | null): string {
  if (s.ramp) {
    const lo = Math.round(s.ramp.from * 100);
    const hi = Math.round(s.ramp.to * 100);
    if (ftp) return `${wattsAt(ftp, s.ramp.from)}–${wattsAt(ftp, s.ramp.to)} W`;
    return `${lo}–${hi}% FTP`;
  }
  if (s.repeat && s.offPower != null) {
    const onPct = Math.round(s.power * 100);
    const offPct = Math.round(s.offPower * 100);
    if (ftp) return `${wattsAt(ftp, s.power)} W / ${wattsAt(ftp, s.offPower)} W`;
    return `${onPct}% / ${offPct}% FTP`;
  }
  const pct = Math.round(s.power * 100);
  if (ftp) return `${wattsAt(ftp, s.power)} W`;
  return `${pct}% FTP`;
}
