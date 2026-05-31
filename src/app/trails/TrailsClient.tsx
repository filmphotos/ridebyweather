"use client";

import { useCallback, useEffect, useState } from "react";
import LocationSearch, { type PickedLocation } from "@/components/LocationSearch/LocationSearch";

type TrailKind = "cycle_route" | "mtb_route" | "cycleway" | "mtb_trail" | "path";

interface Trail {
  id: string;
  name: string;
  kind: TrailKind;
  ref: string | null;
  surface: string | null;
  lengthMi: number | null;
  mtbScale: number | null;
  network: string | null;
  website: string | null;
  wikipedia: string | null;
  lat: number;
  lng: number;
  distanceMi: number;
}

interface ApiResponse {
  trails: Trail[];
  truncated: boolean;
  total: number;
  radiusMi: number;
}

const KIND_FILTERS: Array<{ id: "all" | TrailKind; label: string }> = [
  { id: "all", label: "All" },
  { id: "cycle_route", label: "Cycle routes" },
  { id: "cycleway", label: "Cycleways" },
  { id: "mtb_route", label: "MTB routes" },
  { id: "mtb_trail", label: "MTB trails" },
  { id: "path", label: "Paths" },
];

function kindBadge(kind: TrailKind): { text: string; color: string } {
  switch (kind) {
    case "cycle_route":
      return { text: "Cycle route", color: "bg-sky-500/15 text-sky-300 border-sky-500/30" };
    case "mtb_route":
      return { text: "MTB route", color: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
    case "mtb_trail":
      return { text: "MTB trail", color: "bg-orange-500/15 text-orange-300 border-orange-500/30" };
    case "cycleway":
      return { text: "Cycleway", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" };
    case "path":
      return { text: "Path", color: "bg-violet-500/15 text-violet-300 border-violet-500/30" };
  }
}

function mtbScaleLabel(scale: number): string {
  // Standard mtb:scale (S0-S5 + 6) — keep terse.
  return ["S0 easy", "S1 beginner", "S2 intermediate", "S3 advanced", "S4 expert", "S5 extreme", "S6 unrideable"][scale] ?? `S${scale}`;
}

function surfaceLabel(raw: string): string {
  // Most OSM surface values are already friendly (asphalt, gravel, dirt) —
  // just title-case the common ones and pass through.
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function osmLink(id: string): string {
  // "r12345" / "w12345" / "n12345"
  const type = id.startsWith("r") ? "relation" : id.startsWith("w") ? "way" : "node";
  return `https://www.openstreetmap.org/${type}/${id.slice(1)}`;
}

export default function TrailsClient() {
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [trails, setTrails] = useState<Trail[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [filter, setFilter] = useState<"all" | TrailKind>("all");
  const [radius, setRadius] = useState<number>(20);

  const handleSelect = useCallback((loc: PickedLocation) => {
    setLocation(loc);
  }, []);

  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setTrails(null);
    setTruncated(false);

    const params = new URLSearchParams({
      lat: String(location.lat),
      lng: String(location.lng),
      radius: String(radius),
    });
    fetch(`/api/trails?${params.toString()}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Trails lookup failed (${r.status})`);
        return (await r.json()) as ApiResponse;
      })
      .then((data) => {
        if (cancelled) return;
        setTrails(data.trails ?? []);
        setTruncated(Boolean(data.truncated));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Something went wrong");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [location, radius]);

  const visible = trails?.filter((t) => filter === "all" || t.kind === filter) ?? null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bike Trails</h1>
          <p className="mt-1 text-sm text-gray-400 max-w-xl">
            Named cycle routes, rail-trails, greenways, and MTB tracks near any location —
            from OpenStreetMap. Tap a name to view the trail on OSM.
          </p>
          {location?.name && <p className="mt-1 text-sm text-gray-500">{location.name}</p>}
        </div>
        <LocationSearch onSelect={handleSelect} />
      </div>

      {location && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {KIND_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                filter === f.id
                  ? "border-sky-500 bg-sky-500/15 text-sky-200"
                  : "border-gray-700 bg-gray-900/40 text-gray-300 hover:border-gray-600"
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
            <label htmlFor="radius">Radius</label>
            <input
              id="radius"
              type="range"
              min={5}
              max={50}
              step={5}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="accent-sky-500"
            />
            <span className="w-10 text-right text-gray-300">{radius} mi</span>
          </div>
        </div>
      )}

      {!location && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="text-6xl">🚵</div>
          <p className="text-gray-400">Allow location or search a city to see nearby trails.</p>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <ul className="space-y-3" aria-label="Loading trails">
          {[1, 2, 3, 4, 5].map((i) => (
            <li key={i} className="rounded-lg border border-gray-800 bg-gray-900/40 p-4">
              <div className="h-4 w-2/3 animate-pulse rounded bg-gray-800" />
              <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-gray-800/70" />
              <div className="mt-3 h-3 w-1/3 animate-pulse rounded bg-gray-800/50" />
            </li>
          ))}
        </ul>
      )}

      {!loading && visible && visible.length === 0 && (
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-6 text-center text-sm text-gray-400">
          {trails && trails.length > 0
            ? "No trails match this filter — try a different category."
            : `No trails found within ${radius} mi. Try a larger radius or a different location.`}
        </div>
      )}

      {!loading && visible && visible.length > 0 && (
        <>
          <ul className="space-y-3">
            {visible.map((t) => {
              const badge = kindBadge(t.kind);
              return (
                <li
                  key={t.id}
                  className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 hover:border-gray-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={osmLink(t.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base font-semibold text-white hover:text-sky-300 truncate"
                        >
                          {t.name}
                        </a>
                        <span
                          className={`inline-block rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${badge.color}`}
                        >
                          {badge.text}
                        </span>
                        {t.ref && (
                          <span className="inline-block rounded border border-gray-700 bg-gray-800/50 px-2 py-0.5 text-[10px] font-mono text-gray-300">
                            {t.ref}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-400">
                        {t.lengthMi !== null && (
                          <span>{t.lengthMi.toFixed(1)} mi long</span>
                        )}
                        {t.surface && <span>· {surfaceLabel(t.surface)}</span>}
                        {t.mtbScale !== null && (
                          <span>· {mtbScaleLabel(t.mtbScale)}</span>
                        )}
                        {t.network && <span>· {t.network}</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        {t.website && (
                          <a
                            href={t.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-400 hover:text-sky-300 truncate max-w-[14rem]"
                          >
                            {t.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                          </a>
                        )}
                        {t.wikipedia && (
                          <a
                            href={t.wikipedia}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-400 hover:text-sky-300"
                          >
                            Wikipedia
                          </a>
                        )}
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${t.lat}&mlon=${t.lng}#map=14/${t.lat}/${t.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-400 hover:text-sky-300"
                        >
                          Map ↗
                        </a>
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-xs text-gray-500">
                      {t.distanceMi.toFixed(1)} mi
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <span>
              {visible.length} {filter === "all" ? "trail" : "trail"}
              {visible.length === 1 ? "" : "s"}
              {filter !== "all" && trails && ` of ${trails.length} total`}
            </span>
            {truncated && (
              <span className="text-amber-400/80">
                Showing top 40 — narrow the radius for full results
              </span>
            )}
            <span>Data © OpenStreetMap contributors</span>
          </div>
        </>
      )}
    </div>
  );
}
