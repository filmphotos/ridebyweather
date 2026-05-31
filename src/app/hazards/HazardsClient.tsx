"use client";

import { useEffect, useState } from "react";

type HazardKind = "pothole" | "debris" | "closure" | "glass" | "construction";

interface Hazard {
  id: string;
  kind: HazardKind;
  lat: number;
  lng: number;
  note: string;
  createdAt: number;
}

const KIND_META: Record<HazardKind, { label: string; emoji: string; color: string }> = {
  pothole: { label: "Pothole", emoji: "🕳️", color: "#f97316" },
  debris: { label: "Debris", emoji: "🪵", color: "#a855f7" },
  closure: { label: "Closure", emoji: "🚧", color: "#ef4444" },
  glass: { label: "Glass", emoji: "🥃", color: "#eab308" },
  construction: { label: "Construction", emoji: "🚜", color: "#0ea5e9" },
};

const EXPIRY_DAYS = 30;
const STORAGE_KEY = "rbw_hazards";

export default function HazardsClient() {
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [draft, setDraft] = useState<{ kind: HazardKind; note: string; lat: string; lng: string }>(
    { kind: "pothole", note: "", lat: "", lng: "" }
  );
  const [gpsBusy, setGpsBusy] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const all = JSON.parse(raw) as Hazard[];
      const fresh = all.filter((h) => Date.now() - h.createdAt < EXPIRY_DAYS * 24 * 3600 * 1000);
      setHazards(fresh);
      if (fresh.length !== all.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      }
    } catch {}
  }, []);

  const persist = (list: Hazard[]) => {
    setHazards(list);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
  };

  const addHazard = () => {
    const lat = Number(draft.lat);
    const lng = Number(draft.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const h: Hazard = {
      id: crypto.randomUUID(),
      kind: draft.kind,
      lat,
      lng,
      note: draft.note,
      createdAt: Date.now(),
    };
    persist([h, ...hazards]);
    setDraft({ kind: draft.kind, note: "", lat: "", lng: "" });
  };

  const removeHazard = (id: string) => {
    persist(hazards.filter((h) => h.id !== id));
  };

  const useGps = () => {
    if (!navigator.geolocation) return;
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDraft((d) => ({ ...d, lat: pos.coords.latitude.toFixed(5), lng: pos.coords.longitude.toFixed(5) }));
        setGpsBusy(false);
      },
      () => setGpsBusy(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Hazard Pins</h1>
        <p className="mt-1 text-sm text-gray-400 max-w-xl">
          Drop a pin where the road bites — potholes, glass, debris, construction. Pins expire
          after {EXPIRY_DAYS} days. Saved on this device until the community map ships.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Drop a pin</h2>

          <div className="mt-4">
            <span className="text-sm text-gray-300">Type</span>
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              {(Object.keys(KIND_META) as HazardKind[]).map((k) => {
                const meta = KIND_META[k];
                const selected = draft.kind === k;
                return (
                  <button
                    key={k}
                    onClick={() => setDraft((d) => ({ ...d, kind: k }))}
                    className={`flex flex-col items-center gap-0.5 rounded-md border px-1 py-2 text-[10px] transition-colors ${
                      selected ? "border-sky-500 bg-sky-500/15 text-white" : "border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-700"
                    }`}
                  >
                    <span className="text-lg">{meta.emoji}</span>
                    <span className="leading-tight">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400">Latitude</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="40.71234"
                value={draft.lat}
                onChange={(e) => setDraft((d) => ({ ...d, lat: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Longitude</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="-74.00567"
                value={draft.lng}
                onChange={(e) => setDraft((d) => ({ ...d, lng: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <button
            onClick={useGps}
            disabled={gpsBusy}
            className="mt-2 text-xs text-sky-400 hover:text-sky-300 disabled:opacity-50"
          >
            {gpsBusy ? "Locating…" : "Use my current GPS"}
          </button>

          <div className="mt-3">
            <label className="text-xs text-gray-400">Note (optional)</label>
            <input
              type="text"
              placeholder="Deep one in the gutter line"
              value={draft.note}
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
              maxLength={140}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-sky-500"
            />
          </div>

          <button
            onClick={addHazard}
            disabled={!draft.lat || !draft.lng}
            className="btn-primary mt-4 w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Pin hazard
          </button>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Active pins ({hazards.length})</h2>
          {hazards.length === 0 ? (
            <p className="mt-3 text-sm text-gray-400">No hazards pinned yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 max-h-96 overflow-y-auto">
              {hazards.map((h) => {
                const meta = KIND_META[h.kind];
                const age = Math.floor((Date.now() - h.createdAt) / (24 * 3600 * 1000));
                return (
                  <li key={h.id} className="flex items-start gap-3 rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2">
                    <span className="text-2xl">{meta.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold text-white" style={{ color: meta.color }}>{meta.label}</span>
                        <span className="text-[10px] uppercase tracking-wide text-gray-500">{age === 0 ? "today" : `${age}d ago`}</span>
                      </div>
                      <div className="text-[11px] text-gray-500 tabular-nums">{h.lat.toFixed(4)}, {h.lng.toFixed(4)}</div>
                      {h.note && <p className="mt-1 text-sm text-gray-300">{h.note}</p>}
                    </div>
                    <button
                      onClick={() => removeHazard(h.id)}
                      className="text-xs text-gray-500 hover:text-red-400"
                    >
                      Clear
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
