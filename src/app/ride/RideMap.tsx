"use client";

import { useCallback, useMemo, useRef, useEffect, useState } from "react";
import { Map, Source, Layer, Marker, NavigationControl } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import type { TrackPoint } from "@/lib/ride/rideMath";

interface Props {
  points: TrackPoint[];
  heading?: number;
  windDirDeg?: number;
  windSpeedMph?: number;
}

interface RideRestaurant {
  id: string;
  name: string;
  type: "restaurant" | "cafe";
  lat: number;
  lng: number;
  distanceMi: number;
}

type CleanTier = "likely_clean" | "basic" | "caution" | "unrated";

interface RideBathroom {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceMi: number;
  cleanTier: CleanTier;
  cleanReasons: string[];
  openingHours: string | null;
  source?: "refuge" | "osm";
}

type MedicalType = "hospital" | "urgent_care" | "clinic";

interface RideMedical {
  id: string;
  name: string;
  type: MedicalType;
  lat: number;
  lng: number;
  distanceMi: number;
  address: string | null;
  phone: string | null;
}

const CLEAN_TIER_LABEL: Record<CleanTier, string> = {
  likely_clean: "Likely clean",
  basic: "Basic",
  caution: "Use caution",
  unrated: "Unrated",
};

const CLEAN_TIER_COLOR: Record<CleanTier, string> = {
  likely_clean: "bg-emerald-600",
  basic: "bg-sky-600",
  caution: "bg-rose-600",
  unrated: "bg-gray-600",
};

const MEDICAL_LABEL: Record<MedicalType, string> = {
  hospital: "Hospital",
  urgent_care: "Urgent care",
  clinic: "Clinic",
};

const MEDICAL_COLOR: Record<MedicalType, string> = {
  hospital: "bg-red-600",
  urgent_care: "bg-pink-600",
  clinic: "bg-rose-500",
};

const MEDICAL_EMOJI: Record<MedicalType, string> = {
  hospital: "🏥",
  urgent_care: "➕",
  clinic: "🩺",
};

interface RoadClosure {
  id: string;
  lat: number;
  lng: number;
  type: "closure" | "hazard" | "construction" | "flooding" | "crash" | "other";
  description: string | null;
  severity: "info" | "warning" | "danger";
  confirmations: number;
  isMine: boolean;
  distanceMi: number;
}

const CLOSURE_TYPES: Array<{ id: RoadClosure["type"]; label: string; emoji: string }> = [
  { id: "closure", label: "Road closed", emoji: "🚧" },
  { id: "hazard", label: "Hazard", emoji: "⚠️" },
  { id: "construction", label: "Construction", emoji: "👷" },
  { id: "flooding", label: "Flooding", emoji: "🌊" },
  { id: "crash", label: "Crash", emoji: "💥" },
  { id: "other", label: "Other", emoji: "❗" },
];

function closureMeta(type: RoadClosure["type"]) {
  return CLOSURE_TYPES.find((c) => c.id === type) ?? CLOSURE_TYPES[CLOSURE_TYPES.length - 1];
}

// Only re-fetch restaurants when the rider moves >2 km from the last fetch
// — avoids hammering /api/partners on every GPS tick.
const REFETCH_DISTANCE_M = 2000;

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function RideMap({ points, heading, windDirDeg, windSpeedMph }: Props) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapRef = useRef<MapRef | null>(null);
  const current = points[points.length - 1];

  const [restaurants, setRestaurants] = useState<RideRestaurant[]>([]);
  const [showRestaurants, setShowRestaurants] = useState(true);
  const [selected, setSelected] = useState<RideRestaurant | null>(null);

  const [bathrooms, setBathrooms] = useState<RideBathroom[]>([]);
  const [showBathrooms, setShowBathrooms] = useState(true);
  const [selectedBathroom, setSelectedBathroom] = useState<RideBathroom | null>(null);

  const [medical, setMedical] = useState<RideMedical[]>([]);
  const [showMedical, setShowMedical] = useState(true);
  const [selectedMedical, setSelectedMedical] = useState<RideMedical | null>(null);

  const [mapError, setMapError] = useState<string | null>(null);
  const lastFetchRef = useRef<{ lat: number; lng: number } | null>(null);

  const [closures, setClosures] = useState<RoadClosure[]>([]);
  const [selectedClosure, setSelectedClosure] = useState<RoadClosure | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const lastClosureFetchRef = useRef<{ lat: number; lng: number } | null>(null);

  // Fetch restaurants once we have a fix, then re-fetch only when the rider
  // has moved >REFETCH_DISTANCE_M from where we last asked.
  useEffect(() => {
    if (!current) return;
    const last = lastFetchRef.current;
    if (last && haversineM(last.lat, last.lng, current.lat, current.lng) < REFETCH_DISTANCE_M) return;
    lastFetchRef.current = { lat: current.lat, lng: current.lng };
    // 25 mi matches the route-planner map. radius=10 made bathrooms + medical
    // come back empty on rural rides where the nearest facility is 12–20 mi
    // away. Intentionally NOT aborting on cleanup: GPS updates fire this
    // effect on every tick, and aborting the in-flight fetch before it
    // resolves combined with the 2 km throttle below meant the first fetch
    // never landed in state when the rider was sitting still.
    fetch(
      `/api/partners?lat=${current.lat}&lng=${current.lng}&sport=cycling&radius=25`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Array.isArray(d.restaurants)) setRestaurants(d.restaurants as RideRestaurant[]);
        if (d && Array.isArray(d.bathrooms)) setBathrooms(d.bathrooms as RideBathroom[]);
        if (d && Array.isArray(d.medical)) setMedical(d.medical as RideMedical[]);
      })
      .catch(() => {});
  }, [current?.lat, current?.lng]);

  // --- rider-reported road closures / problems ---------------------------
  const fetchClosures = useCallback((lat: number, lng: number) => {
    fetch(`/api/road-closures?lat=${lat}&lng=${lng}&radius=15`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Array.isArray(d.closures)) setClosures(d.closures as RoadClosure[]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!current) return;
    const last = lastClosureFetchRef.current;
    if (last && haversineM(last.lat, last.lng, current.lat, current.lng) < REFETCH_DISTANCE_M) return;
    lastClosureFetchRef.current = { lat: current.lat, lng: current.lng };
    fetchClosures(current.lat, current.lng);
  }, [current?.lat, current?.lng, fetchClosures]);

  const reportClosure = async (type: RoadClosure["type"]) => {
    if (!current) return;
    setReportBusy(true);
    try {
      const res = await fetch("/api/road-closures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: current.lat, lng: current.lng, type }),
      });
      if (res.ok) {
        lastClosureFetchRef.current = null; // force a refetch that includes the new report
        fetchClosures(current.lat, current.lng);
      }
    } catch {
      // best-effort
    } finally {
      setReportBusy(false);
      setReportOpen(false);
    }
  };

  const confirmClosure = async (id: string) => {
    try {
      const res = await fetch(`/api/road-closures/${id}`, { method: "POST" });
      if (!res.ok) return;
      const d = await res.json();
      const n = d.closure?.confirmations as number | undefined;
      if (n == null) return;
      setClosures((cs) => cs.map((c) => (c.id === id ? { ...c, confirmations: n } : c)));
      setSelectedClosure((s) => (s && s.id === id ? { ...s, confirmations: n } : s));
    } catch {
      // best-effort
    }
  };

  const removeClosure = async (id: string) => {
    try {
      const res = await fetch(`/api/road-closures/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setClosures((cs) => cs.filter((c) => c.id !== id));
      setSelectedClosure(null);
    } catch {
      // best-effort
    }
  };

  const trackGeoJSON = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: points.length >= 2
      ? [{
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: points.map((p) => [p.lng, p.lat]),
          },
          properties: {},
        }]
      : [],
  }), [points]);

  // Keep current position centered as the rider moves
  useEffect(() => {
    if (!mapRef.current || !current) return;
    mapRef.current.easeTo({
      center: [current.lng, current.lat],
      duration: 600,
    });
  }, [current?.lat, current?.lng]);

  if (!token) {
    return (
      <div className="flex h-[460px] items-center justify-center text-sm text-gray-500 p-6 text-center">
        Mapbox token missing — add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local for the live map.
      </div>
    );
  }

  if (!current) {
    return (
      <div className="flex h-[460px] items-center justify-center text-sm text-gray-500">
        Waiting for GPS fix…
      </div>
    );
  }

  return (
    <div className="relative h-[60vh] min-h-[420px] w-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        initialViewState={{ longitude: current.lng, latitude: current.lat, zoom: 15 }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        onLoad={() => setMapError(null)}
        onError={(e) => {
          const msg =
            (e as unknown as { error?: { message?: string } })?.error?.message ??
            "Map failed to load";
          console.error("[RideMap] Mapbox error:", msg, e);
          setMapError(msg);
        }}
      >
        <NavigationControl position="bottom-right" />

        {trackGeoJSON.features.length > 0 && (
          <Source id="track" type="geojson" data={trackGeoJSON}>
            <Layer
              id="track-shadow"
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{ "line-color": "#0ea5e9", "line-width": 10, "line-opacity": 0.25, "line-blur": 4 }}
            />
            <Layer
              id="track-line"
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{ "line-color": "#0ea5e9", "line-width": 5, "line-opacity": 0.95 }}
            />
          </Source>
        )}

        {/* Start marker */}
        {points.length > 1 && (
          <Marker longitude={points[0].lng} latitude={points[0].lat} anchor="center">
            <div className="h-3 w-3 rounded-full bg-emerald-500 border-2 border-white shadow-lg" />
          </Marker>
        )}

        {/* Current position — pulsing dot, rotated by heading */}
        <Marker longitude={current.lng} latitude={current.lat} anchor="center">
          <div className="relative">
            <div className="absolute -inset-3 rounded-full bg-sky-500/30 animate-ping" />
            <div className="relative h-5 w-5 rounded-full bg-sky-500 border-2 border-white shadow-lg flex items-center justify-center">
              {heading != null && (
                <svg
                  className="h-3 w-3 text-white"
                  viewBox="0 0 24 24" fill="currentColor"
                  style={{ transform: `rotate(${heading}deg)` }}
                >
                  <polygon points="12,2 18,22 12,18 6,22" />
                </svg>
              )}
            </div>
          </div>
        </Marker>

        {/* Nearby restaurants & cafes — food stops during the ride */}
        {showRestaurants && restaurants.map((r) => (
          <Marker
            key={r.id}
            longitude={r.lng}
            latitude={r.lat}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelected(r);
            }}
          >
            <div
              title={`${r.name} · ${r.distanceMi.toFixed(1)} mi`}
              className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow-lg cursor-pointer text-[12px] ${
                r.type === "cafe" ? "bg-amber-600" : "bg-orange-600"
              }`}
            >
              {r.type === "cafe" ? "☕" : "🍽"}
            </div>
          </Marker>
        ))}

        {selected && (
          <Marker
            longitude={selected.lng}
            latitude={selected.lat}
            anchor="bottom"
            offset={[0, -28]}
          >
            <div className="rounded-lg border border-amber-500/50 bg-gray-900/95 backdrop-blur-sm px-3 py-2 text-xs shadow-xl min-w-[160px]">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-white truncate">{selected.name}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelected(null); }}
                  className="text-gray-500 hover:text-gray-300 text-base leading-none"
                  aria-label="Close"
                >×</button>
              </div>
              <p className="text-amber-400 mt-0.5">
                {selected.type === "cafe" ? "Cafe" : "Restaurant"} · {selected.distanceMi.toFixed(1)} mi
              </p>
            </div>
          </Marker>
        )}

        {/* Nearby bathrooms — color-coded by estimated cleanliness */}
        {showBathrooms && bathrooms.map((b) => (
          <Marker
            key={b.id}
            longitude={b.lng}
            latitude={b.lat}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelectedBathroom(b);
            }}
          >
            <div
              title={`${b.name} · ${CLEAN_TIER_LABEL[b.cleanTier]} · ${b.distanceMi.toFixed(1)} mi`}
              className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow-lg cursor-pointer text-[12px] ${CLEAN_TIER_COLOR[b.cleanTier]}`}
            >
              🚻
            </div>
          </Marker>
        ))}

        {selectedBathroom && (
          <Marker
            longitude={selectedBathroom.lng}
            latitude={selectedBathroom.lat}
            anchor="bottom"
            offset={[0, -28]}
          >
            <div className="rounded-lg border border-emerald-500/50 bg-gray-900/95 backdrop-blur-sm px-3 py-2 text-xs shadow-xl min-w-[180px] max-w-[240px]">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-white truncate">{selectedBathroom.name}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelectedBathroom(null); }}
                  className="text-gray-500 hover:text-gray-300 text-base leading-none"
                  aria-label="Close"
                >×</button>
              </div>
              <p className="text-emerald-400 mt-0.5">
                {CLEAN_TIER_LABEL[selectedBathroom.cleanTier]} · {selectedBathroom.distanceMi.toFixed(1)} mi
              </p>
              {selectedBathroom.cleanReasons.length > 0 && (
                <p className="mt-1 text-gray-400">{selectedBathroom.cleanReasons.join(" · ")}</p>
              )}
            </div>
          </Marker>
        )}

        {/* Hospitals, urgent care, clinics */}
        {showMedical && medical.map((m) => (
          <Marker
            key={m.id}
            longitude={m.lng}
            latitude={m.lat}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelectedMedical(m);
            }}
          >
            <div
              title={`${m.name} · ${MEDICAL_LABEL[m.type]} · ${m.distanceMi.toFixed(1)} mi`}
              className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow-lg cursor-pointer text-[12px] ${MEDICAL_COLOR[m.type]}`}
            >
              {MEDICAL_EMOJI[m.type]}
            </div>
          </Marker>
        ))}

        {selectedMedical && (
          <Marker
            longitude={selectedMedical.lng}
            latitude={selectedMedical.lat}
            anchor="bottom"
            offset={[0, -28]}
          >
            <div className="rounded-lg border border-red-500/50 bg-gray-900/95 backdrop-blur-sm px-3 py-2 text-xs shadow-xl min-w-[180px] max-w-[240px]">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-white truncate">{selectedMedical.name}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelectedMedical(null); }}
                  className="text-gray-500 hover:text-gray-300 text-base leading-none"
                  aria-label="Close"
                >×</button>
              </div>
              <p className="text-red-400 mt-0.5">
                {MEDICAL_LABEL[selectedMedical.type]} · {selectedMedical.distanceMi.toFixed(1)} mi
              </p>
              {selectedMedical.phone && (
                <a href={`tel:${selectedMedical.phone}`} className="mt-1 block text-sky-400 hover:underline">
                  📞 {selectedMedical.phone}
                </a>
              )}
              {selectedMedical.address && (
                <p className="mt-1 text-gray-400 truncate">{selectedMedical.address}</p>
              )}
            </div>
          </Marker>
        )}

        {/* Rider-reported road closures & hazards */}
        {closures.map((c) => {
          const ring =
            c.severity === "danger" ? "bg-red-600" : c.severity === "info" ? "bg-sky-600" : "bg-amber-600";
          return (
            <Marker
              key={c.id}
              longitude={c.lng}
              latitude={c.lat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedClosure(c);
              }}
            >
              <div
                title={closureMeta(c.type).label}
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white shadow-lg cursor-pointer text-[13px] ${ring}`}
              >
                {closureMeta(c.type).emoji}
              </div>
            </Marker>
          );
        })}

        {selectedClosure && (
          <Marker longitude={selectedClosure.lng} latitude={selectedClosure.lat} anchor="bottom" offset={[0, -30]}>
            <div className="rounded-lg border border-gray-600 bg-gray-900/95 backdrop-blur-sm px-3 py-2 text-xs shadow-xl min-w-[180px]">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-white">
                  {closureMeta(selectedClosure.type).emoji} {closureMeta(selectedClosure.type).label}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedClosure(null);
                  }}
                  className="text-gray-500 hover:text-gray-300 text-base leading-none"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              {selectedClosure.description && (
                <p className="text-gray-400 mt-1">{selectedClosure.description}</p>
              )}
              <p className="text-gray-500 mt-1">
                {selectedClosure.distanceMi.toFixed(1)} mi away · {selectedClosure.confirmations} confirmed
              </p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => confirmClosure(selectedClosure.id)}
                  className="rounded-md bg-gray-800 hover:bg-gray-700 border border-gray-700 px-2 py-1 text-gray-200"
                >
                  ✓ Still there
                </button>
                {selectedClosure.isMine && (
                  <button
                    type="button"
                    onClick={() => removeClosure(selectedClosure.id)}
                    className="rounded-md px-2 py-1 text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </Marker>
        )}
      </Map>

      {mapError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-sm p-4 text-center">
          <p className="text-sm font-medium text-red-400">Map couldn&apos;t load</p>
          <p className="mt-1 text-xs text-gray-400 max-w-md break-words">{mapError}</p>
          <p className="mt-2 text-[11px] text-gray-600">
            Likely an invalid or restricted Mapbox token. Check NEXT_PUBLIC_MAPBOX_TOKEN.
          </p>
        </div>
      )}

      {/* Bottom-left stack: Report button on top, layer toggles below.
          One flex-col so the toggles row can wrap on narrow screens without
          ever colliding with the Report button (the previous absolute layout
          had toggles at bottom-3 and Report at bottom-14, which overlapped
          once the toggles wrapped to two lines on mobile). */}
      <div className="absolute bottom-3 left-3 flex flex-col items-start gap-1.5 max-w-[calc(100%-1.5rem)]">
        <div className="relative">
          {reportOpen && (
            <div className="absolute bottom-full left-0 mb-2 rounded-lg border border-gray-700 bg-gray-900 shadow-xl overflow-hidden text-xs min-w-[160px]">
              {CLOSURE_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={reportBusy}
                  onClick={() => reportClosure(t.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-200 hover:bg-gray-800 disabled:opacity-50 border-b border-gray-800 last:border-0"
                >
                  <span>{t.emoji}</span> {t.label}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setReportOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl bg-gray-900/85 backdrop-blur-sm px-2.5 py-1.5 border border-amber-500/40 text-amber-400 text-xs"
            aria-expanded={reportOpen}
          >
            <span className="text-sm leading-none">⚠️</span>
            {reportBusy ? "Reporting…" : "Report"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowRestaurants((v) => !v)}
            className={`flex items-center gap-1.5 rounded-xl bg-gray-900/85 backdrop-blur-sm px-2.5 py-1.5 border text-xs transition-colors ${
              showRestaurants
                ? "border-amber-500/40 text-amber-400"
                : "border-gray-700/60 text-gray-500 hover:text-gray-300"
            }`}
            aria-pressed={showRestaurants}
          >
            <span className="text-sm leading-none">🍽</span>
            Food {showRestaurants ? `(${restaurants.length})` : "off"}
          </button>
          <button
            type="button"
            onClick={() => setShowBathrooms((v) => !v)}
            className={`flex items-center gap-1.5 rounded-xl bg-gray-900/85 backdrop-blur-sm px-2.5 py-1.5 border text-xs transition-colors ${
              showBathrooms
                ? "border-emerald-500/40 text-emerald-400"
                : "border-gray-700/60 text-gray-500 hover:text-gray-300"
            }`}
            aria-pressed={showBathrooms}
          >
            <span className="text-sm leading-none">🚻</span>
            WC {showBathrooms ? `(${bathrooms.length})` : "off"}
          </button>
          <button
            type="button"
            onClick={() => setShowMedical((v) => !v)}
            className={`flex items-center gap-1.5 rounded-xl bg-gray-900/85 backdrop-blur-sm px-2.5 py-1.5 border text-xs transition-colors ${
              showMedical
                ? "border-red-500/40 text-red-400"
                : "border-gray-700/60 text-gray-500 hover:text-gray-300"
            }`}
            aria-pressed={showMedical}
          >
            <span className="text-sm leading-none">🏥</span>
            ER {showMedical ? `(${medical.length})` : "off"}
          </button>
        </div>
      </div>

      {/* Wind overlay */}
      {windDirDeg != null && windSpeedMph != null && (
        <div className="absolute top-3 left-3 flex items-center gap-2 rounded-xl bg-gray-900/85 backdrop-blur-sm px-3 py-2 border border-gray-700/60 text-xs text-gray-300">
          <svg
            className="h-5 w-5 text-sky-400 flex-shrink-0"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
            style={{ transform: `rotate(${(windDirDeg + 180) % 360}deg)` }}
          >
            <line x1="12" y1="20" x2="12" y2="4" />
            <polyline points="6 10 12 4 18 10" />
          </svg>
          <div>
            <p className="font-semibold text-white leading-none">{Math.round(windSpeedMph)} mph</p>
            <p className="text-gray-500 text-[10px] mt-0.5">wind</p>
          </div>
        </div>
      )}
    </div>
  );
}
