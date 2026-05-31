"use client";

import { useMemo, useState } from "react";
import { HOTSPOTS, listCities, forCity, riskColor } from "@/lib/theftHotspots";

export default function TheftClient() {
  const cities = useMemo(listCities, []);
  const [city, setCity] = useState<string>(cities[0]);
  const items = useMemo(() => forCity(city), [city]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Bike Theft Hotspots</h1>
        <p className="mt-1 text-sm text-gray-400 max-w-xl">
          Neighborhood-level risk index. Use it to decide where to lock up — or whether to bring
          the bike inside. Seed data; live open-data feeds plug in here.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {cities.map((c) => (
          <button
            key={c}
            onClick={() => setCity(c)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              city === c
                ? "border-sky-500 bg-sky-500/15 text-white"
                : "border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-700"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {items.map((h) => (
          <div key={h.neighborhood} className="card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white">{h.neighborhood}</h3>
                <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">{h.state}</p>
              </div>
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 tabular-nums font-bold"
                style={{ borderColor: riskColor(h.riskScore), color: riskColor(h.riskScore) }}
              >
                {h.riskScore.toFixed(1)}
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-300">{h.advice}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 card bg-gray-900/40 text-xs text-gray-500">
        Risk scored 0–10. Data sources: aggregated city open-data theft reports (2023–2024) and
        BikeIndex.org recovery statistics. Doesn&apos;t replace good locks — always U-lock + cable
        through the frame and a wheel.
      </div>
    </div>
  );
}

void HOTSPOTS;
