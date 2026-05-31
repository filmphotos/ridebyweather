"use client";

import { useEffect, useMemo, useState } from "react";
import { computeStreak, evaluateAchievements, type LoggedRide } from "@/lib/streaks";

const STORAGE_KEY = "rbw_rides_log";

export default function StreaksClient() {
  const [rides, setRides] = useState<LoggedRide[]>([]);

  // Quick-log form state.
  const [dateIso, setDateIso] = useState(() => todayIso());
  const [durationMin, setDurationMin] = useState<number | "">(60);
  const [tempF, setTempF] = useState<number | "">(60);
  const [precipProb, setPrecipProb] = useState<number | "">(0);
  const [windSpeedMph, setWindSpeedMph] = useState<number | "">(8);
  const [isDawn, setIsDawn] = useState(false);
  const [isDusk, setIsDusk] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setRides(JSON.parse(raw) as LoggedRide[]);
    } catch {}
  }, []);

  const persist = (next: LoggedRide[]) => {
    setRides(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  const streak = useMemo(() => computeStreak(rides), [rides]);
  const achievements = useMemo(() => evaluateAchievements(rides, streak), [rides, streak]);
  const earnedCount = achievements.filter((a) => a.earned).length;

  const logRide = () => {
    if (!dateIso) return;
    const r: LoggedRide = {
      id: crypto.randomUUID(),
      dateIso,
      durationMin: typeof durationMin === "number" ? durationMin : 60,
      tempF: typeof tempF === "number" ? tempF : 60,
      precipProb: typeof precipProb === "number" ? precipProb : 0,
      windSpeedMph: typeof windSpeedMph === "number" ? windSpeedMph : 0,
      isDawn,
      isDusk,
      notes: notes || undefined,
    };
    // Newest first.
    persist([r, ...rides]);
    setNotes("");
    setIsDawn(false);
    setIsDusk(false);
  };

  const removeRide = (id: string) => {
    persist(rides.filter((r) => r.id !== id));
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Streaks & Achievements</h1>
        <p className="mt-1 text-sm text-gray-400 max-w-xl">
          Log a ride after you finish. Track your streak, unlock weather-class badges, and watch
          the year add up.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-4">
        <StatCard label="Current streak" value={`${streak.currentDays}`} sub="days" color="#f97316" />
        <StatCard label="Longest streak" value={`${streak.longestDays}`} sub="days" color="#a855f7" />
        <StatCard label="Rides logged" value={`${streak.totalRides}`} sub="all-time" color="#0ea5e9" />
        <StatCard label="Badges" value={`${earnedCount}`} sub={`of ${achievements.length}`} color="#22c55e" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Log a ride</h2>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">Date</label>
              <input
                type="date"
                value={dateIso}
                onChange={(e) => setDateIso(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-sky-500"
              />
            </div>
            <Num label="Duration (min)" value={durationMin} setValue={setDurationMin} min={5} max={720} step={5} />
            <Num label="Temp (°F)" value={tempF} setValue={setTempF} min={-20} max={130} step={1} />
            <Num label="Wind (mph)" value={windSpeedMph} setValue={setWindSpeedMph} min={0} max={60} step={1} />
            <Num label="Rain prob (0-1)" value={precipProb} setValue={setPrecipProb} min={0} max={1} step={0.05} />
          </div>

          <div className="mt-3 flex items-center gap-4 text-sm text-gray-300">
            <label className="inline-flex items-center gap-1.5">
              <input type="checkbox" checked={isDawn} onChange={(e) => setIsDawn(e.target.checked)} className="rounded border-gray-700 bg-gray-900 text-sky-500" />
              Dawn start
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input type="checkbox" checked={isDusk} onChange={(e) => setIsDusk(e.target.checked)} className="rounded border-gray-700 bg-gray-900 text-sky-500" />
              Dusk start
            </label>
          </div>

          <div className="mt-3">
            <label className="text-xs text-gray-400">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={140}
              placeholder="Felt great, fast tailwind home."
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-sky-500"
            />
          </div>

          <button onClick={logRide} className="btn-primary mt-4 w-full">Log ride</button>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Recent rides</h2>
          {rides.length === 0 ? (
            <p className="mt-3 text-sm text-gray-400">No rides logged yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 max-h-80 overflow-y-auto">
              {rides.slice(0, 30).map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-3 rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white tabular-nums">{r.dateIso}</span>
                      <span className="text-xs text-gray-400">{r.durationMin} min · {Math.round(r.tempF)}°F · {Math.round(r.windSpeedMph)} mph · {Math.round(r.precipProb * 100)}% rain</span>
                    </div>
                    {(r.isDawn || r.isDusk) && (
                      <div className="mt-1 flex gap-1.5 text-[10px]">
                        {r.isDawn && <span className="rounded bg-amber-500/10 text-amber-300 px-1.5 py-0.5">DAWN</span>}
                        {r.isDusk && <span className="rounded bg-purple-500/10 text-purple-300 px-1.5 py-0.5">DUSK</span>}
                      </div>
                    )}
                    {r.notes && <p className="mt-1 text-sm text-gray-300">{r.notes}</p>}
                  </div>
                  <button onClick={() => removeRide(r.id)} className="text-xs text-gray-500 hover:text-red-400 shrink-0">×</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">Achievements</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {achievements.map((a) => (
            <div
              key={a.id}
              className={`rounded-xl border px-3 py-3 transition-colors ${
                a.earned ? "border-emerald-500/40 bg-emerald-500/5" : "border-gray-800 bg-gray-900/30 opacity-70"
              }`}
            >
              <div className="text-3xl">{a.emoji}</div>
              <div className="mt-1 text-sm font-semibold text-white">{a.label}</div>
              <div className="text-[11px] text-gray-400 leading-tight">{a.description}</div>
              {a.progress && !a.earned && (
                <div className="mt-2">
                  <div className="h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, (a.progress.have / a.progress.need) * 100)}%` }} />
                  </div>
                  <div className="mt-0.5 text-[10px] text-gray-500 tabular-nums">{a.progress.have} / {a.progress.need}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-3xl font-bold tabular-nums" style={{ color }}>{value}</span>
        <span className="text-xs text-gray-500">{sub}</span>
      </div>
    </div>
  );
}

function Num({ label, value, setValue, min, max, step }: { label: string; value: number | ""; setValue: (n: number | "") => void; min: number; max: number; step: number }) {
  return (
    <div>
      <label className="text-xs text-gray-400">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value === "" ? "" : String(value)}
        onChange={(e) => setValue(e.target.value === "" ? "" : Number(e.target.value))}
        className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-sky-500"
      />
    </div>
  );
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
