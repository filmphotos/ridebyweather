"use client";

import { useMemo, useState } from "react";
import {
  closuresForCity,
  listClosureCities,
  severityColor,
  severityLabel,
} from "@/lib/bikeLaneClosures";

export default function ClosuresClient() {
  const cities = useMemo(listClosureCities, []);
  const [city, setCity] = useState<string>(cities[0]);
  const items = useMemo(() => closuresForCity(city), [city]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Bike Lane Closures</h1>
        <p className="mt-1 text-sm text-gray-400 max-w-xl">
          Current bike-lane and multi-use trail closures by city. v1 seed list, hand-curated.
          Live city open-data feeds plug in as they go live.
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

      {items.length === 0 ? (
        <div className="card text-sm text-gray-400">No current closures on file for {city}.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {items.map((c) => {
            const color = severityColor(c.severity);
            return (
              <div key={c.id} className="card border-l-4" style={{ borderLeftColor: color }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                        style={{ backgroundColor: color + "22", color }}
                      >
                        {severityLabel(c.severity)}
                      </span>
                      <h3 className="text-base font-semibold text-white">{c.street}</h3>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{c.segment}</p>
                    <p className="mt-2 text-sm text-gray-300">{c.reason}</p>
                    {(c.startsAt || c.endsAt) && (
                      <p className="mt-2 text-[11px] text-gray-500">
                        {c.startsAt && <>Starts {c.startsAt}. </>}
                        {c.endsAt && <>Ends {c.endsAt}.</>}
                      </p>
                    )}
                  </div>
                  {c.sourceUrl && (
                    <a
                      href={c.sourceUrl}
                      target="_blank"
                      rel="noopener"
                      className="text-xs text-sky-400 hover:text-sky-300 shrink-0"
                    >
                      Source ↗
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 card bg-gray-900/40 text-xs text-gray-500">
        Have a closure to add or correct? Email{" "}
        <a href="mailto:closures@ridebyweather.com" className="text-sky-400">closures@ridebyweather.com</a>{" "}
        — we patch the seed list while live API integrations roll out.
      </div>
    </div>
  );
}
