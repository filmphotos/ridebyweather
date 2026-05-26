"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Map, Source, Layer, Marker, NavigationControl } from "react-map-gl/mapbox";
import type { MapMouseEvent } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import StravaImport from "@/components/Strava/StravaImport";
import ElevationProfile from "@/components/RouteMap/ElevationProfile";

interface Props {
  lat: number;
  lng: number;
  windDirDeg: number;
  windSpeedMph: number;
}

type WindType = "tailwind" | "headwind" | "crosswind";

interface Segment {
  from: [number, number];
  to: [number, number];
  windType: WindType;
  color: string;
}

interface SavedRoute {
  id: string;
  name: string;
  sport: string;
  distance: number;
  geometry: string;
  segments: string;
  createdAt: string;
}

const WIND_COLORS: Record<WindType, string> = {
  tailwind: "#22c55e",
  headwind: "#ef4444",
  crosswind: "#eab308",
};

function bearingBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const lat1R = (lat1 * Math.PI) / 180;
  const lat2R = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2R);
  const x = Math.cos(lat1R) * Math.sin(lat2R) - Math.sin(lat1R) * Math.cos(lat2R) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function classifySegment(bearing: number, windDirDeg: number): WindType {
  const windVectorDir = (windDirDeg + 180) % 360;
  const delta = Math.abs((((bearing - windVectorDir + 540) % 360) - 180));
  if (delta <= 45) return "tailwind";
  if (delta >= 135) return "headwind";
  return "crosswind";
}

// Haversine distance in miles
function distanceMi(wps: [number, number][]): number {
  let total = 0;
  for (let i = 0; i < wps.length - 1; i++) {
    const [lng1, lat1] = wps[i];
    const [lng2, lat2] = wps[i + 1];
    const R = 3958.8;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return total;
}

export default function RouteMap({ lat, lng, windDirDeg, windSpeedMph }: Props) {
  const [waypoints, setWaypoints] = useState<[number, number][]>([]);
  const [snappedCoords, setSnappedCoords] = useState<[number, number][]>([]);
  const [snappedDistanceMi, setSnappedDistanceMi] = useState<number | null>(null);
  const [routing, setRouting] = useState(false);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [reversed, setReversed] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Save dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [routeName, setRouteName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Saved routes panel
  const [showSaved, setShowSaved] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [showStravaImport, setShowStravaImport] = useState(false);
  const [stravaConnected, setStravaConnected] = useState(false);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setIsLoggedIn(!!d.user))
      .catch(() => {});
    fetch("/api/strava/status")
      .then((r) => r.json())
      .then((d) => setStravaConnected(!!d.connected))
      .catch(() => {});
  }, []);

  const fetchSavedRoutes = useCallback(async () => {
    setLoadingRoutes(true);
    try {
      const res = await fetch("/api/routes");
      if (res.ok) {
        const data = await res.json();
        setSavedRoutes(data.routes ?? []);
      }
    } finally {
      setLoadingRoutes(false);
    }
  }, []);

  const handleMapClick = useCallback((e: MapMouseEvent) => {
    setWaypoints((prev) => [...prev, [e.lngLat.lng, e.lngLat.lat]]);
  }, []);

  const activeWaypoints = useMemo(
    () => (reversed ? [...waypoints].reverse() : waypoints),
    [waypoints, reversed]
  );

  // Fetch road-snapped route from Mapbox Directions when waypoints change.
  // Falls back to straight lines if the API fails or the token is missing.
  useEffect(() => {
    if (activeWaypoints.length < 2 || !token) {
      setSnappedCoords([]);
      setSnappedDistanceMi(null);
      setRoutingError(null);
      return;
    }

    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setRouting(true);
      setRoutingError(null);
      try {
        const coords = activeWaypoints.map(([lo, la]) => `${lo},${la}`).join(";");
        const url =
          `https://api.mapbox.com/directions/v5/mapbox/cycling/${coords}` +
          `?geometries=geojson&overview=full&access_token=${encodeURIComponent(token)}`;
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`Directions ${res.status}`);
        const data = (await res.json()) as {
          routes?: { geometry: { coordinates: [number, number][] }; distance: number }[];
        };
        const route = data.routes?.[0];
        if (!route) throw new Error("No route found");
        setSnappedCoords(route.geometry.coordinates);
        setSnappedDistanceMi(route.distance / 1609.34);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setSnappedCoords([]);
        setSnappedDistanceMi(null);
        setRoutingError("Couldn't snap to roads — showing direct line");
      } finally {
        setRouting(false);
      }
    }, 350);

    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [activeWaypoints, token]);

  // Path used for wind coloring + display: snapped if available, else raw waypoints.
  const pathCoords = useMemo(
    () => (snappedCoords.length >= 2 ? snappedCoords : activeWaypoints),
    [snappedCoords, activeWaypoints]
  );

  const segments: Segment[] = useMemo(() => {
    return pathCoords.slice(0, -1).map((p, i) => {
      const bearing = bearingBetween(
        pathCoords[i][1], pathCoords[i][0],
        pathCoords[i + 1][1], pathCoords[i + 1][0]
      );
      const windType = classifySegment(bearing, windDirDeg);
      return { from: p, to: pathCoords[i + 1], windType, color: WIND_COLORS[windType] };
    });
  }, [pathCoords, windDirDeg]);

  const routeGeoJSON = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: segments.map((seg) => ({
      type: "Feature" as const,
      geometry: { type: "LineString" as const, coordinates: [seg.from, seg.to] },
      properties: { color: seg.color },
    })),
  }), [segments]);

  const stats = useMemo(() => {
    if (segments.length === 0) return null;
    const counts = { tailwind: 0, headwind: 0, crosswind: 0 };
    segments.forEach((s) => counts[s.windType]++);
    const total = segments.length;
    return {
      tailwind: Math.round((counts.tailwind / total) * 100),
      headwind: Math.round((counts.headwind / total) * 100),
      crosswind: Math.round((counts.crosswind / total) * 100),
    };
  }, [segments]);

  const recommendation = useMemo(() => {
    if (!stats) return null;
    if (stats.headwind > 50) return { type: "warn" as const, msg: "Mostly headwind — try reversing for a better ride" };
    if (stats.tailwind > 50) return { type: "good" as const, msg: "Mostly tailwind — great direction!" };
    return null;
  }, [stats]);

  const windArrowDeg = (windDirDeg + 180) % 360;
  const routeDistanceMi = useMemo(
    () => snappedDistanceMi ?? distanceMi(activeWaypoints),
    [snappedDistanceMi, activeWaypoints]
  );

  async function handleSaveRoute() {
    if (!routeName.trim()) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: routeName.trim(),
          sport: "cycling",
          waypoints: activeWaypoints,
          segments: segments.map(({ windType, color }) => ({ windType, color })),
          distanceMi: routeDistanceMi,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setShowSaveDialog(false);
      setRouteName("");
      if (showSaved) fetchSavedRoutes();
    } catch {
      setSaveError("Could not save route. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleLoadRoute(route: SavedRoute) {
    try {
      const geo = JSON.parse(route.geometry);
      const coords: [number, number][] = geo.coordinates;
      setWaypoints(coords);
      setReversed(false);
      setShowSaved(false);
    } catch {
      // malformed geometry
    }
  }

  async function handleDeleteRoute(id: string) {
    await fetch(`/api/routes/${id}`, { method: "DELETE" });
    setSavedRoutes((prev) => prev.filter((r) => r.id !== id));
  }

  if (!token) {
    return (
      <div className="card">
        <h3 className="font-semibold text-white mb-1">Route Wind Planner</h3>
        <div className="mt-4 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-700 py-12 text-center">
          <svg className="h-10 w-10 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-gray-300">Mapbox token required</p>
            <p className="mt-1 text-xs text-gray-500">
              Add{" "}
              <code className="rounded bg-gray-800 px-1.5 py-0.5 text-sky-400 text-[11px]">
                NEXT_PUBLIC_MAPBOX_TOKEN=pk_...
              </code>{" "}
              to your .env.local
            </p>
            <p className="mt-1 text-xs text-gray-600">Get a free token at mapbox.com</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-white">Route Wind Planner</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {waypoints.length === 0
              ? "Tap the map to add waypoints — route follows roads"
              : routing
                ? `${waypoints.length} waypoints · routing…`
                : `${waypoints.length} waypoints · ${routeDistanceMi.toFixed(1)} mi${
                    snappedCoords.length >= 2 ? " · road-snapped" : ""
                  }`}
          </p>
          {routingError && (
            <p className="text-xs text-amber-400 mt-0.5">{routingError}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {isLoggedIn && waypoints.length >= 2 && (
            <button
              onClick={() => { setShowSaveDialog(true); setSaveError(""); }}
              className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Save
            </button>
          )}
          {isLoggedIn && (
            <button
              onClick={() => {
                setShowSaved((s) => {
                  if (!s) fetchSavedRoutes();
                  return !s;
                });
              }}
              className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 012 10z" clipRule="evenodd" />
              </svg>
              My Routes
            </button>
          )}
          {waypoints.length >= 2 && (
            <button
              onClick={() => setReversed((r) => !r)}
              className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" />
                <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" />
              </svg>
              Reverse
            </button>
          )}
          {waypoints.length > 0 && (
            <button
              onClick={() => {
                setWaypoints([]);
                setReversed(false);
                setSnappedCoords([]);
                setSnappedDistanceMi(null);
                setRoutingError(null);
              }}
              className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Saved routes panel */}
      {showSaved && (
        <div className="mb-4 rounded-xl border border-gray-700 bg-gray-900/60 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-700 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Saved Routes</span>
            <div className="flex items-center gap-2">
              {stravaConnected && (
                <button
                  onClick={() => setShowStravaImport(true)}
                  className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 font-medium transition-colors"
                  title="Import from Strava"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-orange-400" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066l-2.084 4.116z" />
                    <path d="M11.094 13.828l2.089 4.116 2.08-4.116H20.6L15.387 3 10.18 13.828h.914z" />
                  </svg>
                  Import
                </button>
              )}
              <button onClick={() => setShowSaved(false)} className="text-gray-600 hover:text-gray-400">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          </div>
          {loadingRoutes ? (
            <div className="flex justify-center py-6">
              <div className="h-5 w-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : savedRoutes.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-6">No saved routes yet.</p>
          ) : (
            <div className="divide-y divide-gray-800 max-h-48 overflow-y-auto">
              {savedRoutes.map((route) => (
                <div key={route.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-800/50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{route.name}</p>
                    <p className="text-xs text-gray-500">{route.distance.toFixed(1)} mi · {new Date(route.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    <button
                      onClick={() => handleLoadRoute(route)}
                      className="text-xs text-sky-400 hover:text-sky-300 font-medium"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleDeleteRoute(route.id)}
                      className="text-gray-600 hover:text-red-400 transition-colors"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Save dialog */}
      {showSaveDialog && (
        <div className="mb-4 rounded-xl border border-gray-700 bg-gray-900 p-4">
          <p className="text-sm font-medium text-gray-200 mb-2">Name this route</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              autoFocus
              type="text"
              placeholder="e.g. Morning loop"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveRoute()}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveRoute}
                disabled={saving || !routeName.trim()}
                className="btn-primary text-sm px-4 py-2 disabled:opacity-50 flex-1 sm:flex-none"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => { setShowSaveDialog(false); setRouteName(""); setSaveError(""); }}
                className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 flex-1 sm:flex-none"
              >
                Cancel
              </button>
            </div>
          </div>
          {saveError && <p className="text-xs text-red-400 mt-2">{saveError}</p>}
        </div>
      )}

      {/* Stats bar */}
      {stats && (
        <div className="mb-4 space-y-2">
          <div className="flex gap-1 h-2 rounded-full overflow-hidden">
            {stats.tailwind > 0 && <div className="bg-green-500 transition-all" style={{ width: `${stats.tailwind}%` }} />}
            {stats.crosswind > 0 && <div className="bg-yellow-500 transition-all" style={{ width: `${stats.crosswind}%` }} />}
            {stats.headwind > 0 && <div className="bg-red-500 transition-all" style={{ width: `${stats.headwind}%` }} />}
          </div>
          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-green-400">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              {stats.tailwind}% tailwind
            </span>
            <span className="flex items-center gap-1.5 text-yellow-400">
              <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
              {stats.crosswind}% crosswind
            </span>
            <span className="flex items-center gap-1.5 text-red-400">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
              {stats.headwind}% headwind
            </span>
          </div>
          {recommendation && (
            <p className={`text-xs font-medium ${recommendation.type === "good" ? "text-green-400" : "text-amber-400"}`}>
              {recommendation.type === "good" ? "✓" : "⚡"} {recommendation.msg}
            </p>
          )}
        </div>
      )}

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden h-[320px] sm:h-[440px]">
        <Map
          mapboxAccessToken={token}
          initialViewState={{ longitude: lng, latitude: lat, zoom: 11 }}
          style={{ width: "100%", height: "100%" }}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          onClick={handleMapClick}
          cursor={waypoints.length < 20 ? "crosshair" : "default"}
        >
          <NavigationControl position="bottom-right" />

          {segments.length > 0 && (
            <Source id="route" type="geojson" data={routeGeoJSON}>
              <Layer
                id="route-shadow"
                type="line"
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{ "line-color": ["get", "color"], "line-width": 10, "line-opacity": 0.2, "line-blur": 4 }}
              />
              <Layer
                id="route-line"
                type="line"
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{ "line-color": ["get", "color"], "line-width": 5, "line-opacity": 0.95 }}
              />
            </Source>
          )}

          {/* "You are here" marker — pulsing dot at the dashboard's detected location */}
          <Marker longitude={lng} latitude={lat} anchor="center">
            <div className="relative" title="Your location">
              <div className="absolute -inset-3 rounded-full bg-sky-500/30 animate-ping" />
              <div className="relative h-4 w-4 rounded-full bg-sky-500 border-2 border-white shadow-lg" />
            </div>
          </Marker>

          {activeWaypoints.map((wp, i) => (
            <Marker key={`${i}-${wp[0]}-${wp[1]}`} longitude={wp[0]} latitude={wp[1]} anchor="center">
              <div className={`rounded-full border-2 border-white shadow-lg ${
                i === 0 ? "h-4 w-4 bg-sky-500"
                : i === activeWaypoints.length - 1 ? "h-4 w-4 bg-purple-500"
                : "h-2.5 w-2.5 bg-gray-400"
              }`} />
            </Marker>
          ))}
        </Map>

        {/* Wind indicator */}
        <div className="absolute top-3 left-3 flex items-center gap-2 rounded-xl bg-gray-900/85 backdrop-blur-sm px-3 py-2 border border-gray-700/60 text-xs text-gray-300">
          <svg
            className="h-5 w-5 text-sky-400 flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            style={{ transform: `rotate(${windArrowDeg}deg)` }}
          >
            <line x1="12" y1="20" x2="12" y2="4" />
            <polyline points="6 10 12 4 18 10" />
          </svg>
          <div>
            <p className="font-semibold text-white leading-none">{Math.round(windSpeedMph)} mph</p>
            <p className="text-gray-500 text-[10px] mt-0.5">wind</p>
          </div>
        </div>

        {waypoints.length === 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-10 flex justify-center">
            <div className="rounded-xl bg-gray-900/80 backdrop-blur-sm px-4 py-2.5 border border-gray-700/50 text-center">
              <p className="text-sm font-medium text-gray-200">Click anywhere to start your route</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Segments will color by wind impact</p>
            </div>
          </div>
        )}
      </div>

      {/* Live elevation + gradient profile */}
      <ElevationProfile waypoints={pathCoords} />

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="inline-block h-1 w-5 rounded-full bg-green-500" />Tailwind</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-1 w-5 rounded-full bg-yellow-500" />Crosswind</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-1 w-5 rounded-full bg-red-500" />Headwind</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full bg-sky-500 border border-white" />Start</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full bg-purple-500 border border-white" />End</span>
      </div>

      {!isLoggedIn && waypoints.length >= 2 && (
        <p className="mt-3 text-center text-xs text-gray-500">
          <a href="/signup" className="text-sky-400 hover:underline">Sign up</a> to save routes
        </p>
      )}

      {showStravaImport && (
        <StravaImport
          onImported={() => {
            setShowStravaImport(false);
            fetchSavedRoutes();
            if (!showSaved) setShowSaved(true);
          }}
          onClose={() => setShowStravaImport(false)}
        />
      )}
    </div>
  );
}
