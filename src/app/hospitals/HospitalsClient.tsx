"use client";

import { useState } from "react";

interface MedicalResult {
  id: string;
  name: string;
  type: "hospital" | "urgent_care" | "clinic";
  address: string | null;
  phone: string | null;
  website: string | null;
  distanceMi: number;
}

interface GeoResult {
  name: string;
  display: string;
  lat: number;
  lng: number;
  country: string;
}

function typeLabel(t: MedicalResult["type"]): { text: string; color: string } {
  switch (t) {
    case "urgent_care":
      return { text: "Urgent Care", color: "bg-orange-500/15 text-orange-300 border-orange-500/30" };
    case "hospital":
      return { text: "Hospital", color: "bg-red-500/15 text-red-300 border-red-500/30" };
    case "clinic":
      return { text: "Clinic", color: "bg-sky-500/15 text-sky-300 border-sky-500/30" };
  }
}

export default function HospitalsClient() {
  const [zip, setZip] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [place, setPlace] = useState<GeoResult | null>(null);
  const [results, setResults] = useState<MedicalResult[] | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResults(null);
    setPlace(null);

    if (!/^\d{5}$/.test(zip.trim())) {
      setError("Enter a 5-digit US ZIP code.");
      return;
    }

    setLoading(true);
    try {
      const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(zip.trim())}`);
      if (!geoRes.ok) throw new Error("Geocoding failed");
      const geoData = (await geoRes.json()) as { results: GeoResult[] };
      const hit = geoData.results?.[0];
      if (!hit) {
        setError("ZIP not found. Try another.");
        setLoading(false);
        return;
      }
      setPlace(hit);

      const medRes = await fetch(`/api/medical?lat=${hit.lat}&lng=${hit.lng}&radius=15`);
      if (!medRes.ok) throw new Error("Medical lookup failed");
      const medData = (await medRes.json()) as { medical: MedicalResult[] };
      setResults(medData.medical ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2 mb-6">
        <input
          type="text"
          inputMode="numeric"
          pattern="\d{5}"
          maxLength={5}
          value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
          placeholder="ZIP code (e.g. 10001)"
          className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-white placeholder-gray-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          aria-label="ZIP code"
        />
        <button
          type="submit"
          disabled={loading || zip.length !== 5}
          className="rounded-lg bg-sky-500 px-5 py-2.5 font-medium text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Searching…" : "Find Nearby"}
        </button>
      </form>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {place && (
        <div className="mb-4 text-sm text-gray-400">
          Showing results near <span className="text-white">{place.display}</span>
        </div>
      )}

      {results && results.length === 0 && (
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-6 text-center text-sm text-gray-400">
          No hospitals or clinics found within 15 miles.
        </div>
      )}

      {results && results.length > 0 && (
        <ul className="space-y-3">
          {results.map((m) => {
            const badge = typeLabel(m.type);
            return (
              <li
                key={m.id}
                className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 hover:border-gray-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-white truncate">{m.name}</h3>
                      <span className={`inline-block rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${badge.color}`}>
                        {badge.text}
                      </span>
                    </div>
                    {m.address && (
                      <p className="mt-1 text-sm text-gray-400">{m.address}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      {m.phone && (
                        <a
                          href={`tel:${m.phone.replace(/[^\d+]/g, "")}`}
                          className="text-sky-400 hover:text-sky-300"
                        >
                          {m.phone}
                        </a>
                      )}
                      {m.website && (
                        <a
                          href={m.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-400 hover:text-sky-300 truncate max-w-[16rem]"
                        >
                          {m.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                      )}
                      {!m.phone && !m.website && (
                        <span className="text-xs text-gray-500 italic">
                          No phone or website listed
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-xs text-gray-500">
                    {m.distanceMi.toFixed(1)} mi
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
