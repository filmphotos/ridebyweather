"use client";

import { useEffect, useMemo, useState } from "react";

// EPA: 8.89 kg CO2 per gallon of gasoline burned.
const CO2_PER_GALLON_KG = 8.89;
// IRS 2025 standard mileage rate ~ $0.67 / mi (includes wear, insurance, depreciation).
const DRIVE_COST_PER_MI = 0.67;
// Cycling at ~14 mph burns ~30 kcal/mile for an average rider.
const KCAL_PER_MILE_CYCLING = 30;

export default function BikeVsDriveClient() {
  const [distance, setDistance] = useState<number | "">(8);
  const [mpg, setMpg] = useState<number | "">(28);
  const [gas, setGas] = useState<number | "">(3.6);
  const [daysPerWeek, setDaysPerWeek] = useState<number>(5);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("rbw_bike_vs_drive");
      if (!raw) return;
      const s = JSON.parse(raw);
      if (typeof s.distance === "number") setDistance(s.distance);
      if (typeof s.mpg === "number") setMpg(s.mpg);
      if (typeof s.gas === "number") setGas(s.gas);
      if (typeof s.daysPerWeek === "number") setDaysPerWeek(s.daysPerWeek);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "rbw_bike_vs_drive",
        JSON.stringify({ distance, mpg, gas, daysPerWeek })
      );
    } catch {}
  }, [distance, mpg, gas, daysPerWeek]);

  const stats = useMemo(() => {
    const d = typeof distance === "number" ? distance : 0;
    const m = typeof mpg === "number" ? mpg : 28;
    const g = typeof gas === "number" ? gas : 3.6;
    // Round-trip distance.
    const rt = d * 2;
    const gallonsPerDay = rt / m;
    const dollarsPerDay = rt * DRIVE_COST_PER_MI;
    const gasOnlyPerDay = gallonsPerDay * g;
    const kgCO2PerDay = gallonsPerDay * CO2_PER_GALLON_KG;
    const kcalPerDay = rt * KCAL_PER_MILE_CYCLING;

    return {
      perDay: {
        dollars: dollarsPerDay,
        gasOnly: gasOnlyPerDay,
        kgCO2: kgCO2PerDay,
        kcal: kcalPerDay,
      },
      perWeek: {
        dollars: dollarsPerDay * daysPerWeek,
        gasOnly: gasOnlyPerDay * daysPerWeek,
        kgCO2: kgCO2PerDay * daysPerWeek,
        kcal: kcalPerDay * daysPerWeek,
      },
      perYear: {
        dollars: dollarsPerDay * daysPerWeek * 50,
        gasOnly: gasOnlyPerDay * daysPerWeek * 50,
        kgCO2: kgCO2PerDay * daysPerWeek * 50,
        kcal: kcalPerDay * daysPerWeek * 50,
      },
    };
  }, [distance, mpg, gas, daysPerWeek]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Bike vs Drive</h1>
        <p className="mt-1 text-sm text-gray-400 max-w-xl">
          Real cost of driving the commute today: gas, wear & tear, calories you didn&apos;t burn,
          and CO₂ in the air.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Your commute</h2>

          <div className="mt-4 space-y-3">
            <NumberField label="One-way miles" value={distance} setValue={setDistance} min={0.5} max={60} step={0.5} />
            <NumberField label="Car MPG" value={mpg} setValue={setMpg} min={10} max={70} step={1} />
            <NumberField label="Gas $/gal" value={gas} setValue={setGas} min={2} max={8} step={0.1} />
            <div>
              <label className="flex items-center justify-between text-sm text-gray-300">
                <span>Days per week</span>
                <span className="font-semibold text-white tabular-nums">{daysPerWeek}</span>
              </label>
              <input
                type="range"
                min={1}
                max={7}
                step={1}
                value={daysPerWeek}
                onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                className="mt-2 w-full accent-sky-500"
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <SavingsCard title="Today (round trip)" stats={stats.perDay} />
          <SavingsCard title="This week" stats={stats.perWeek} />
          <SavingsCard title="Per year (50 weeks)" stats={stats.perYear} highlight />
        </div>
      </div>
    </div>
  );
}

function NumberField({ label, value, setValue, min, max, step }: { label: string; value: number | ""; setValue: (n: number | "") => void; min: number; max: number; step: number }) {
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

interface Savings {
  dollars: number;
  gasOnly: number;
  kgCO2: number;
  kcal: number;
}

function SavingsCard({ title, stats, highlight }: { title: string; stats: Savings; highlight?: boolean }) {
  return (
    <div className={`card ${highlight ? "border-emerald-500/40 ring-1 ring-emerald-500/30" : ""}`}>
      <div className="text-xs uppercase tracking-wide text-gray-500">{title}</div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Big label="Saved" value={`$${stats.dollars.toFixed(stats.dollars < 100 ? 2 : 0)}`} color="#10b981" />
        <Big label="Gas alone" value={`$${stats.gasOnly.toFixed(stats.gasOnly < 100 ? 2 : 0)}`} color="#f59e0b" />
        <Big label="CO₂ avoided" value={`${stats.kgCO2.toFixed(stats.kgCO2 < 10 ? 1 : 0)} kg`} color="#22c55e" />
        <Big label="Calories burned" value={`${Math.round(stats.kcal).toLocaleString()}`} color="#ec4899" />
      </div>
    </div>
  );
}

function Big({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-3 text-center">
      <div className="text-xl font-bold tabular-nums" style={{ color }}>{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
    </div>
  );
}
