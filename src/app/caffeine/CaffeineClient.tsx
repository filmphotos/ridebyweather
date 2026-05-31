"use client";

import { useEffect, useMemo, useState } from "react";
import { plan, recommendedDoseRangeMg, SOURCES, type Source } from "@/lib/caffeine";

const STATUS_COLOR: Record<string, string> = {
  low: "#eab308",
  "in-range": "#22c55e",
  high: "#f97316",
  "very-high": "#ef4444",
};

export default function CaffeineClient() {
  const [rideStart, setRideStart] = useState("08:00");
  const [duration, setDuration] = useState(90);
  const [weightLb, setWeightLb] = useState<number | "">(165);
  const [quantity, setQuantity] = useState<Record<Source, number>>({
    espresso: 0,
    coffee: 1,
    "energy-gel": 0,
    "pre-workout": 0,
    tea: 0,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem("rbw_caffeine");
      if (!raw) return;
      const s = JSON.parse(raw);
      if (typeof s.rideStart === "string") setRideStart(s.rideStart);
      if (typeof s.duration === "number") setDuration(s.duration);
      if (typeof s.weightLb === "number") setWeightLb(s.weightLb);
      if (s.quantity && typeof s.quantity === "object") setQuantity(s.quantity);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("rbw_caffeine", JSON.stringify({ rideStart, duration, weightLb, quantity }));
    } catch {}
  }, [rideStart, duration, weightLb, quantity]);

  const range = useMemo(
    () => recommendedDoseRangeMg(typeof weightLb === "number" ? weightLb : 165),
    [weightLb]
  );

  const p = useMemo(
    () =>
      plan({
        rideStartClockTime: rideStart,
        durationMin: duration,
        sourceQuantity: quantity,
        sources: SOURCES,
        weightLb: typeof weightLb === "number" ? weightLb : 165,
      }),
    [rideStart, duration, quantity, weightLb]
  );

  const setQty = (id: Source, delta: number) => {
    setQuantity((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) }));
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Caffeine Timing</h1>
        <p className="mt-1 text-sm text-gray-400 max-w-xl">
          When to drink your coffee so peak plasma hits the start line. Plus the right dose for
          your weight, and a top-up for long rides.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Your ride</h2>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">Ride start</label>
              <input
                type="time"
                value={rideStart}
                onChange={(e) => setRideStart(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Weight (lb)</label>
              <input
                type="number"
                inputMode="numeric"
                min={90}
                max={350}
                value={weightLb === "" ? "" : String(weightLb)}
                onChange={(e) => setWeightLb(e.target.value === "" ? "" : Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center justify-between text-sm text-gray-300">
              <span>Duration</span>
              <span className="font-semibold text-white tabular-nums">
                {Math.floor(duration / 60)}h {duration % 60}m
              </span>
            </label>
            <input
              type="range"
              min={30}
              max={360}
              step={15}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="mt-2 w-full accent-sky-500"
            />
          </div>

          <div className="mt-5">
            <span className="text-sm text-gray-300">Sources today</span>
            <ul className="mt-2 space-y-2">
              {SOURCES.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl shrink-0">{s.emoji}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{s.label}</div>
                      <div className="text-xs text-gray-500">{s.mg} mg each · {s.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setQty(s.id, -1)} className="h-7 w-7 rounded border border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-600">−</button>
                    <span className="w-6 text-center text-sm font-bold tabular-nums text-white">{quantity[s.id] || 0}</span>
                    <button onClick={() => setQty(s.id, 1)} className="h-7 w-7 rounded border border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-600">+</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Plan</h2>

          <div className="mt-4 rounded-xl border border-sky-500/30 bg-sky-500/10 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400">Drink your caffeine at</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-sky-400 tabular-nums">{p.intakeClockTime}</span>
              <span className="text-sm text-gray-400">({p.intakeMinBeforeRide} min before ride)</span>
            </div>
          </div>

          {p.secondDoseClockTime && (
            <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="text-xs uppercase tracking-wide text-amber-200">Top-up at</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-amber-300 tabular-nums">{p.secondDoseClockTime}</span>
                <span className="text-sm text-amber-200/80">({p.secondDoseMinAfterStart} min into ride)</span>
              </div>
              <p className="mt-2 text-xs text-amber-100/80">Caffeinated gel is ideal — fast onset, no GI surprises.</p>
            </div>
          )}

          <div className="mt-4 rounded-lg border border-gray-800 bg-gray-900/40 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-gray-400">Total dose</span>
              <span className="text-xs font-bold uppercase tabular-nums" style={{ color: STATUS_COLOR[p.doseStatus] }}>
                {p.totalMg} mg
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, (p.totalMg / (range.hi * 1.5)) * 100)}%`, backgroundColor: STATUS_COLOR[p.doseStatus] }} />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-gray-500 tabular-nums">
              <span>0</span>
              <span>{range.lo} mg low</span>
              <span>{range.hi} mg high</span>
            </div>
            <p className="mt-3 text-xs text-gray-300">{p.doseNote}</p>
          </div>

          <p className="mt-4 text-sm text-gray-300">{p.advice}</p>

          <p className="mt-4 text-[11px] text-gray-500">
            Half-life is ~5h — caffeine after lunchtime can disturb sleep for the next day&apos;s ride.
          </p>
        </div>
      </div>
    </div>
  );
}
