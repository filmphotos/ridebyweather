"use client";

import { useEffect, useState } from "react";
import { computePressure, type Surface } from "@/lib/tirePressure";

const SURFACES: { id: Surface; label: string; emoji: string }[] = [
  { id: "smooth", label: "Smooth road", emoji: "🛣️" },
  { id: "rough", label: "Chip-seal", emoji: "🪨" },
  { id: "wet", label: "Wet road", emoji: "💧" },
  { id: "gravel", label: "Gravel", emoji: "🚵" },
  { id: "mtb", label: "MTB trail", emoji: "🌲" },
];

export default function TirePressureClient() {
  const [riderLb, setRiderLb] = useState<number | "">(165);
  const [bikeLb, setBikeLb] = useState<number | "">(20);
  const [tireMm, setTireMm] = useState<number>(28);
  const [surface, setSurface] = useState<Surface>("smooth");
  const [tubeless, setTubeless] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("rbw_tire_pressure");
      if (!raw) return;
      const s = JSON.parse(raw);
      if (typeof s.riderLb === "number") setRiderLb(s.riderLb);
      if (typeof s.bikeLb === "number") setBikeLb(s.bikeLb);
      if (typeof s.tireMm === "number") setTireMm(s.tireMm);
      if (typeof s.surface === "string") setSurface(s.surface);
      if (typeof s.tubeless === "boolean") setTubeless(s.tubeless);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "rbw_tire_pressure",
        JSON.stringify({ riderLb, bikeLb, tireMm, surface, tubeless })
      );
    } catch {}
  }, [riderLb, bikeLb, tireMm, surface, tubeless]);

  const systemLb =
    (typeof riderLb === "number" ? riderLb : 165) +
    (typeof bikeLb === "number" ? bikeLb : 20);

  const plan = computePressure({
    systemWeightLb: systemLb,
    tireWidthMm: tireMm,
    surface,
    tubeless,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Tire Pressure Calculator</h1>
        <p className="mt-1 text-sm text-gray-400 max-w-xl">
          Front/rear PSI tuned to your weight, tire width, and surface. Wider tires + lower
          pressure roll as fast as narrow + high — and grip way better.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Inputs</h2>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">Rider weight (lb)</label>
              <input
                type="number"
                inputMode="numeric"
                min={80}
                max={350}
                value={riderLb === "" ? "" : String(riderLb)}
                onChange={(e) => setRiderLb(e.target.value === "" ? "" : Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Bike + gear (lb)</label>
              <input
                type="number"
                inputMode="numeric"
                min={10}
                max={60}
                value={bikeLb === "" ? "" : String(bikeLb)}
                onChange={(e) => setBikeLb(e.target.value === "" ? "" : Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center justify-between text-sm text-gray-300">
              <span>Tire width</span>
              <span className="font-semibold text-white tabular-nums">{tireMm} mm</span>
            </label>
            <input
              type="range"
              min={23}
              max={62}
              step={1}
              value={tireMm}
              onChange={(e) => setTireMm(Number(e.target.value))}
              className="mt-2 w-full accent-sky-500"
            />
          </div>

          <div className="mt-4">
            <span className="text-sm text-gray-300">Surface</span>
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              {SURFACES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSurface(s.id)}
                  className={`flex flex-col items-center gap-0.5 rounded-md border px-1 py-2 text-[10px] transition-colors ${
                    surface === s.id
                      ? "border-sky-500 bg-sky-500/15 text-white"
                      : "border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-700"
                  }`}
                >
                  <span className="text-lg">{s.emoji}</span>
                  <span className="leading-tight">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={tubeless}
              onChange={(e) => setTubeless(e.target.checked)}
              className="rounded border-gray-700 bg-gray-900 text-sky-500 focus:ring-sky-500"
            />
            Tubeless setup
          </label>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Recommended pressure</h2>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4 text-center">
              <div className="text-xs uppercase tracking-wide text-gray-500">Front</div>
              <div className="mt-1 text-4xl font-bold text-sky-400 tabular-nums">{plan.frontPsi}</div>
              <div className="text-xs text-gray-500">PSI</div>
            </div>
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4 text-center">
              <div className="text-xs uppercase tracking-wide text-gray-500">Rear</div>
              <div className="mt-1 text-4xl font-bold text-sky-400 tabular-nums">{plan.rearPsi}</div>
              <div className="text-xs text-gray-500">PSI</div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-gray-800 bg-gray-900/50 p-3 text-sm text-gray-300">
            {plan.note}
          </div>

          <p className="mt-4 text-xs text-gray-500">
            System weight: {systemLb} lb. Pressure scales with system weight ÷ tire-width². Cap is 110 PSI.
          </p>
        </div>
      </div>
    </div>
  );
}
