"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useWakeLock } from "@/lib/useWakeLock";
import {
  altDeltaFt,
  bearingDeg,
  fmtDuration,
  haversineM,
  MS_TO_MPH,
  M_TO_FT,
  M_TO_MI,
  windRelativeTo,
  type TrackPoint,
  type WindRelative,
} from "@/lib/ride/rideMath";
import { saveRide, type RideRecord } from "@/lib/ride/rideStorage";
import { addPhoto, requestPersistence } from "@/lib/photos/photoStore";

const RideMap = dynamic(() => import("./RideMap"), { ssr: false });

type Tab = "stats" | "map" | "weather";
type State = "idle" | "recording" | "paused" | "ended";

interface WeatherSnapshot {
  tempF: number;
  feelsLikeF: number;
  humidity: number;
  windSpeedMph: number;
  windGustMph: number;
  windDirDeg: number;
  precipProb: number;
  condition: string;
  score: number;
  label: string;
  color: string;
  fetchedAt: number;
}

interface ForecastPoint {
  timestamp: number;
  score: number;
  label: string;
  color: string;
  weather: {
    tempF: number;
    windSpeedMph: number;
    windGustMph: number;
    precipProb: number;
    condition: string;
  };
}

const WEATHER_REFRESH_MS = 5 * 60 * 1000;          // every 5 min
const WEATHER_MOVE_THRESHOLD_M = 1500;             // OR after moving >1.5 km
const AUTO_PAUSE_SPEED_MS = 0.45;                  // ~1 mph
const AUTO_PAUSE_AFTER_S = 12;
const NEW_LAP_DIST_MI = 1;                         // auto-lap each mile

export default function LiveRide() {
  // --- state --------------------------------------------------------------
  const [state, setState] = useState<State>("idle");
  const [tab, setTab] = useState<Tab>("stats");
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [laps, setLaps] = useState<Array<{ t: number; distMi: number }>>([]);
  const [autoPause, setAutoPause] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geoSupported] = useState(typeof navigator !== "undefined" && !!navigator.geolocation);

  // Distance / time accumulators are derived from points; kept here for live readout.
  const [totalDistM, setTotalDistM] = useState(0);
  const [movingTimeS, setMovingTimeS] = useState(0);
  const [ascentFt, setAscentFt] = useState(0);
  const [descentFt, setDescentFt] = useState(0);
  const [maxSpeedMs, setMaxSpeedMs] = useState(0);
  const [now, setNow] = useState(Date.now());

  // Weather
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Refs to avoid stale closures in geolocation callback
  const stateRef = useRef(state);
  const pointsRef = useRef<TrackPoint[]>([]);
  const lastMoveTRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const lastWeatherFetchRef = useRef<{ t: number; lat: number; lng: number } | null>(null);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { pointsRef.current = points; }, [points]);

  const wakeLock = useWakeLock(state === "recording" || state === "paused");

  // Quick photo capture — saves to IndexedDB scoped to the current ride id.
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoStatus, setPhotoStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [photoCount, setPhotoCount] = useState(0);

  const handlePhotoFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || !startedAtRef.current) return;
    setPhotoStatus("saving");
    try {
      await requestPersistence();
      const rideId = `ride_${startedAtRef.current}`;
      let added = 0;
      for (const f of Array.from(files)) {
        if (!f.type.startsWith("image/")) continue;
        await addPhoto(f, { rideId });
        added++;
      }
      setPhotoCount((c) => c + added);
      setPhotoStatus("saved");
      setTimeout(() => setPhotoStatus("idle"), 1500);
    } catch {
      setPhotoStatus("idle");
    } finally {
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }, []);

  // Tick clock for elapsed-time displays
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // --- weather fetch ------------------------------------------------------
  const fetchWeather = useCallback(async (lat: number, lng: number, heading?: number) => {
    setWeatherLoading(true);
    try {
      const bearingParam = heading != null ? `&routeBearing=${Math.round(heading)}` : "";
      const [curRes, fcRes] = await Promise.all([
        fetch(`/api/ride-score?lat=${lat}&lng=${lng}${bearingParam}`),
        fetch(`/api/weather/forecast?lat=${lat}&lng=${lng}&hours=6`),
      ]);
      if (curRes.ok) {
        const cur = await curRes.json();
        setWeather({
          tempF: cur.weather.tempF,
          feelsLikeF: cur.weather.feelsLikeF,
          humidity: cur.weather.humidity,
          windSpeedMph: cur.weather.windSpeedMph,
          windGustMph: cur.weather.windGustMph,
          windDirDeg: cur.weather.windDirDeg,
          precipProb: cur.weather.precipProb,
          condition: cur.weather.condition,
          score: cur.score,
          label: cur.label,
          color: cur.color,
          fetchedAt: Date.now(),
        });
      }
      if (fcRes.ok) {
        const fc = await fcRes.json();
        setForecast(fc.forecast ?? []);
      }
      lastWeatherFetchRef.current = { t: Date.now(), lat, lng };
    } catch {
      // soft-fail — keep last good snapshot
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  const maybeRefreshWeather = useCallback(
    (lat: number, lng: number, heading?: number) => {
      const last = lastWeatherFetchRef.current;
      const elapsed = last ? Date.now() - last.t : Infinity;
      const moved = last ? haversineM(last.lat, last.lng, lat, lng) : Infinity;
      if (elapsed > WEATHER_REFRESH_MS || moved > WEATHER_MOVE_THRESHOLD_M) {
        fetchWeather(lat, lng, heading);
      }
    },
    [fetchWeather]
  );

  // --- geolocation handler -----------------------------------------------
  const handlePosition = useCallback(
    (pos: GeolocationPosition) => {
      const t = Date.now();
      const { latitude: lat, longitude: lng, speed, altitude, heading, accuracy } = pos.coords;

      // Always refresh weather for the latest fix, but throttled
      maybeRefreshWeather(lat, lng, heading ?? undefined);

      if (stateRef.current !== "recording") {
        // Allow a "preview" position even before start so the map shows something
        if (pointsRef.current.length === 0) {
          const p: TrackPoint = {
            t, lat, lng,
            speedMs: speed ?? undefined,
            altM: altitude ?? undefined,
            heading: heading ?? undefined,
            accuracy: accuracy ?? undefined,
          };
          setPoints([p]);
        } else {
          // Update the single "current" preview point
          setPoints((prev) => {
            if (prev.length === 1) {
              return [{ t, lat, lng, speedMs: speed ?? undefined, altM: altitude ?? undefined, heading: heading ?? undefined, accuracy: accuracy ?? undefined }];
            }
            return prev;
          });
        }
        return;
      }

      // Recording path
      // Drop very inaccurate fixes (> 40m) to keep distance/elevation sane
      if (accuracy != null && accuracy > 40) return;

      const prev = pointsRef.current[pointsRef.current.length - 1];
      let segM = 0;
      let derivedSpeedMs: number | undefined = speed ?? undefined;

      if (prev) {
        segM = haversineM(prev.lat, prev.lng, lat, lng);
        const dtS = (t - prev.t) / 1000;
        // Reject impossible jumps (>40 m/s = ~90 mph)
        if (segM / Math.max(dtS, 0.001) > 40) return;
        if (derivedSpeedMs == null && dtS > 0) derivedSpeedMs = segM / dtS;
      }

      // Auto-pause logic — track when we were last moving
      const currSpeed = derivedSpeedMs ?? 0;
      if (currSpeed >= AUTO_PAUSE_SPEED_MS) {
        lastMoveTRef.current = t;
      }
      const stalledFor = lastMoveTRef.current ? (t - lastMoveTRef.current) / 1000 : 0;
      const isStalled = autoPause && stalledFor > AUTO_PAUSE_AFTER_S;

      const newPoint: TrackPoint = {
        t, lat, lng,
        speedMs: derivedSpeedMs,
        altM: altitude ?? undefined,
        heading: heading ?? undefined,
        accuracy: accuracy ?? undefined,
      };

      setPoints((prevPoints) => [...prevPoints, newPoint]);

      // Distance only adds when we're actually moving — discard segments while stalled
      if (!isStalled && prev) {
        const newDistM = totalDistMRef.current + segM;
        totalDistMRef.current = newDistM;
        setTotalDistM(newDistM);

        // Moving time
        const dtS = (t - prev.t) / 1000;
        if (currSpeed >= AUTO_PAUSE_SPEED_MS) {
          movingTimeRef.current += dtS;
          setMovingTimeS(movingTimeRef.current);
        }

        // Elevation
        if (prev.altM != null && altitude != null) {
          const { ascent, descent } = altDeltaFt(prev.altM, altitude);
          if (ascent > 0) {
            ascentRef.current += ascent;
            setAscentFt(ascentRef.current);
          }
          if (descent > 0) {
            descentRef.current += descent;
            setDescentFt(descentRef.current);
          }
        }

        // Max speed
        if (currSpeed > maxSpeedRef.current) {
          maxSpeedRef.current = currSpeed;
          setMaxSpeedMs(currSpeed);
        }

        // Auto-lap each mile
        const distMi = newDistM * M_TO_MI;
        const lastLapMi = lapsRef.current.length > 0 ? lapsRef.current[lapsRef.current.length - 1].distMi : 0;
        if (distMi - lastLapMi >= NEW_LAP_DIST_MI) {
          const next = [...lapsRef.current, { t, distMi: Math.floor(distMi * 100) / 100 }];
          lapsRef.current = next;
          setLaps(next);
        }
      }
    },
    [autoPause, maybeRefreshWeather]
  );

  // Mirror accumulators into refs so the geolocation callback can update them without re-binding
  const totalDistMRef = useRef(0);
  const movingTimeRef = useRef(0);
  const ascentRef = useRef(0);
  const descentRef = useRef(0);
  const maxSpeedRef = useRef(0);
  const lapsRef = useRef<Array<{ t: number; distMi: number }>>([]);

  // --- start watching position ASAP for a "ready" feel -------------------
  useEffect(() => {
    if (!geoSupported) return;
    const id = navigator.geolocation.watchPosition(
      handlePosition,
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    );
    watchIdRef.current = id;
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [handlePosition, geoSupported]);

  // --- controls -----------------------------------------------------------
  const start = () => {
    setError(null);
    setPoints((prev) => {
      // Drop the preview-only point if we have one; keep it as the actual first point
      return prev.length > 0 ? [prev[prev.length - 1]] : [];
    });
    totalDistMRef.current = 0;
    movingTimeRef.current = 0;
    ascentRef.current = 0;
    descentRef.current = 0;
    maxSpeedRef.current = 0;
    lapsRef.current = [];
    setTotalDistM(0);
    setMovingTimeS(0);
    setAscentFt(0);
    setDescentFt(0);
    setMaxSpeedMs(0);
    setLaps([]);
    setPhotoCount(0);
    startedAtRef.current = Date.now();
    lastMoveTRef.current = Date.now();
    setState("recording");
  };

  const pause = () => setState("paused");
  const resume = () => {
    lastMoveTRef.current = Date.now();
    setState("recording");
  };

  const end = () => {
    if (!startedAtRef.current || pointsRef.current.length < 2) {
      // Nothing to save
      setState("idle");
      setPoints([]);
      return;
    }
    const startedAt = startedAtRef.current;
    const endedAt = Date.now();
    const totalTimeSec = (endedAt - startedAt) / 1000;
    const distMi = totalDistMRef.current * M_TO_MI;
    const avgMph = movingTimeRef.current > 0 ? (totalDistMRef.current / movingTimeRef.current) * MS_TO_MPH : 0;
    const ride: RideRecord = {
      id: `ride_${startedAt}`,
      startedAt,
      endedAt,
      points: pointsRef.current,
      laps: lapsRef.current,
      totalDistMi: distMi,
      movingTimeSec: movingTimeRef.current,
      totalTimeSec,
      avgSpeedMph: avgMph,
      maxSpeedMph: maxSpeedRef.current * MS_TO_MPH,
      ascentFt: ascentRef.current,
      descentFt: descentRef.current,
    };
    saveRide(ride);
    setState("ended");
  };

  const discardAndReset = () => {
    setState("idle");
    setPoints((prev) => prev.length > 0 ? [prev[prev.length - 1]] : []);
    totalDistMRef.current = 0;
    movingTimeRef.current = 0;
    ascentRef.current = 0;
    descentRef.current = 0;
    maxSpeedRef.current = 0;
    lapsRef.current = [];
    setTotalDistM(0); setMovingTimeS(0); setAscentFt(0); setDescentFt(0); setMaxSpeedMs(0); setLaps([]);
  };

  // --- derived values for display ----------------------------------------
  const current = points[points.length - 1];
  const currentSpeedMph = current?.speedMs != null ? current.speedMs * MS_TO_MPH : 0;
  const distMi = totalDistM * M_TO_MI;
  const totalElapsedSec = startedAtRef.current
    ? (now - startedAtRef.current) / 1000
    : 0;
  const avgMph = movingTimeS > 0 ? (totalDistM / movingTimeS) * MS_TO_MPH : 0;
  const altFt = current?.altM != null ? current.altM * M_TO_FT : null;

  // Heading & wind-relative direction
  const heading = useMemo(() => {
    if (points.length < 2) return current?.heading;
    const last = points[points.length - 1];
    // Use a point a few back to smooth heading
    const back = points[Math.max(0, points.length - 4)];
    if (back && (last.t - back.t) > 0) return bearingDeg(back.lat, back.lng, last.lat, last.lng);
    return last.heading;
  }, [points, current]);

  const windRel: WindRelative | null = weather && heading != null
    ? windRelativeTo(heading, weather.windDirDeg)
    : null;

  // Find next ~15-min rain risk from forecast (hourly precipProb)
  const rainAlert = useMemo(() => {
    if (forecast.length === 0) return null;
    const next = forecast[0];
    if (next && next.weather.precipProb >= 50) {
      return `Rain risk ${next.weather.precipProb}% next hour`;
    }
    return null;
  }, [forecast]);

  // --- render -------------------------------------------------------------
  return (
    <div className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      {/* Status bar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Link href="/cycling" className="text-gray-500 hover:text-sky-400">← Dashboard</Link>
          <span className="text-gray-700">·</span>
          <Link href="/ride/history" className="text-gray-500 hover:text-sky-400">History</Link>
        </div>
        <div className="flex items-center gap-3 text-gray-500">
          {state !== "idle" && (
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={photoStatus === "saving"}
              className="inline-flex items-center gap-1 rounded-md border border-gray-700 bg-gray-800 hover:bg-gray-700 px-2 py-1 text-gray-300 disabled:opacity-50"
              aria-label="Add photo to this ride"
            >
              <span>📷</span>
              <span className="text-[11px]">
                {photoStatus === "saving" ? "Saving…"
                  : photoStatus === "saved" ? "Saved ✓"
                  : photoCount > 0 ? `Photo (${photoCount})` : "Photo"}
              </span>
            </button>
          )}
          {wakeLock.supported && (
            <span className={wakeLock.held ? "text-emerald-400" : "text-gray-600"}>
              {wakeLock.held ? "● screen on" : "○ screen on"}
            </span>
          )}
          <span className={state === "recording" ? "text-red-400" : "text-gray-600"}>
            {state === "recording" ? "● rec" : state === "paused" ? "‖ paused" : state === "ended" ? "✓ saved" : "○ ready"}
          </span>
        </div>
      </div>

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handlePhotoFiles(e.target.files)}
      />

      {error && (
        <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {!geoSupported && (
        <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-400 text-sm">
          Your browser doesn&apos;t expose location. Try Chrome / Safari on mobile.
        </div>
      )}

      {rainAlert && (
        <div className="mb-3 rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-sky-300 text-sm">
          ☔ {rainAlert}
        </div>
      )}

      {/* Tab bar */}
      <div className="mb-4 flex gap-1 rounded-xl border border-gray-800 bg-gray-900 p-1 text-sm">
        {(["stats", "map", "weather"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-3 py-2 font-medium transition-colors ${
              tab === t ? "bg-sky-500 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {t === "stats" ? "Stats" : t === "map" ? "Map" : "Weather"}
          </button>
        ))}
      </div>

      {/* === STATS === */}
      {tab === "stats" && (
        <div className="space-y-3">
          {/* Speed — hero */}
          <div className="card flex flex-col items-center justify-center py-8">
            <div className="text-[10px] uppercase tracking-widest text-gray-500">Speed (mph)</div>
            <div className="text-7xl sm:text-8xl font-bold tabular-nums text-white leading-none mt-1">
              {currentSpeedMph.toFixed(1)}
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
              <span>avg {avgMph.toFixed(1)}</span>
              <span>·</span>
              <span>max {(maxSpeedRef.current * MS_TO_MPH).toFixed(1)}</span>
            </div>
          </div>

          {/* Distance + time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card py-4">
              <div className="text-[10px] uppercase tracking-widest text-gray-500">Distance</div>
              <div className="text-4xl font-bold tabular-nums text-white mt-1">
                {distMi.toFixed(2)}
                <span className="ml-1 text-sm text-gray-500 font-normal">mi</span>
              </div>
            </div>
            <div className="card py-4">
              <div className="text-[10px] uppercase tracking-widest text-gray-500">Time</div>
              <div className="text-4xl font-bold tabular-nums text-white mt-1">
                {fmtDuration(totalElapsedSec)}
              </div>
              <div className="text-[10px] text-gray-500 mt-1">moving {fmtDuration(movingTimeS)}</div>
            </div>
          </div>

          {/* Elevation */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card py-4">
              <div className="text-[10px] uppercase tracking-widest text-gray-500">Elev</div>
              <div className="text-2xl font-bold tabular-nums text-white mt-1">
                {altFt != null ? Math.round(altFt) : "—"}
                <span className="ml-0.5 text-xs text-gray-500 font-normal">ft</span>
              </div>
            </div>
            <div className="card py-4">
              <div className="text-[10px] uppercase tracking-widest text-emerald-400">↑ Ascent</div>
              <div className="text-2xl font-bold tabular-nums text-emerald-400 mt-1">
                {Math.round(ascentFt)}
                <span className="ml-0.5 text-xs text-gray-500 font-normal">ft</span>
              </div>
            </div>
            <div className="card py-4">
              <div className="text-[10px] uppercase tracking-widest text-amber-400">↓ Descent</div>
              <div className="text-2xl font-bold tabular-nums text-amber-400 mt-1">
                {Math.round(descentFt)}
                <span className="ml-0.5 text-xs text-gray-500 font-normal">ft</span>
              </div>
            </div>
          </div>

          {/* Weather chip + wind */}
          {weather && (
            <div className="card py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-gray-500">Now</div>
                    <div className="text-2xl font-bold text-white">{Math.round(weather.tempF)}°F</div>
                    <div className="text-xs text-gray-500">{weather.condition}</div>
                  </div>
                  <div className="border-l border-gray-800 pl-3">
                    <div className="text-[10px] uppercase tracking-widest text-gray-500">Wind</div>
                    <div className="flex items-center gap-1.5">
                      <svg
                        className="h-4 w-4 text-sky-400"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                        style={{ transform: `rotate(${(weather.windDirDeg + 180) % 360}deg)` }}
                      >
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <polyline points="6 10 12 4 18 10" />
                      </svg>
                      <span className="text-xl font-bold text-white tabular-nums">{Math.round(weather.windSpeedMph)}</span>
                      <span className="text-xs text-gray-500">mph</span>
                    </div>
                    {weather.windGustMph > weather.windSpeedMph + 3 && (
                      <div className="text-[10px] text-amber-400">gusts {Math.round(weather.windGustMph)}</div>
                    )}
                  </div>
                </div>
                {windRel && (
                  <div className={`rounded-lg px-3 py-2 text-sm font-bold ${
                    windRel === "tailwind" ? "bg-emerald-500/20 text-emerald-400"
                    : windRel === "headwind" ? "bg-red-500/20 text-red-400"
                    : "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {windRel === "tailwind" ? "↑ TAILWIND"
                      : windRel === "headwind" ? "↓ HEADWIND"
                      : "→ CROSSWIND"}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Laps */}
          {laps.length > 0 && (
            <div className="card py-3">
              <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Mile splits</div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 text-xs">
                {laps.map((lap, i) => {
                  const prevT = i === 0 ? startedAtRef.current ?? lap.t : laps[i - 1].t;
                  const splitSec = (lap.t - prevT) / 1000;
                  return (
                    <div key={i} className="rounded-lg bg-gray-800/60 px-2 py-1.5">
                      <div className="text-gray-500">mi {Math.round(lap.distMi)}</div>
                      <div className="text-white font-semibold tabular-nums">{fmtDuration(splitSec)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* === MAP === */}
      {tab === "map" && (
        <div className="card overflow-hidden p-0">
          <RideMap
            points={points}
            heading={heading}
            windDirDeg={weather?.windDirDeg}
            windSpeedMph={weather?.windSpeedMph}
          />
        </div>
      )}

      {/* === WEATHER === */}
      {tab === "weather" && (
        <div className="space-y-3">
          {weather ? (
            <>
              <div className="card py-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-gray-500">Right Now</div>
                    <div className="mt-1 text-5xl font-bold text-white">{Math.round(weather.tempF)}°F</div>
                    <div className="text-sm text-gray-400 mt-1">{weather.condition}</div>
                    <div className="text-xs text-gray-500 mt-0.5">feels {Math.round(weather.feelsLikeF)}°F · {weather.humidity}% humidity</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-widest text-gray-500">Ride Score</div>
                    <div className="text-5xl font-bold tabular-nums" style={{ color: weather.color }}>
                      {weather.score.toFixed(1)}
                    </div>
                    <div className="text-xs" style={{ color: weather.color }}>{weather.label}</div>
                  </div>
                </div>
              </div>

              <div className="card py-4">
                <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Wind on Your Heading</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg
                      className="h-12 w-12 text-sky-400"
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                      style={{ transform: `rotate(${(weather.windDirDeg + 180) % 360}deg)` }}
                    >
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <polyline points="6 10 12 4 18 10" />
                    </svg>
                    <div>
                      <div className="text-3xl font-bold text-white">{Math.round(weather.windSpeedMph)} mph</div>
                      <div className="text-xs text-gray-500">gusts {Math.round(weather.windGustMph)} mph</div>
                    </div>
                  </div>
                  {windRel && (
                    <div className={`rounded-xl px-4 py-3 text-center ${
                      windRel === "tailwind" ? "bg-emerald-500/15 text-emerald-400"
                      : windRel === "headwind" ? "bg-red-500/15 text-red-400"
                      : "bg-yellow-500/15 text-yellow-400"
                    }`}>
                      <div className="text-xs uppercase tracking-widest">Relative</div>
                      <div className="text-lg font-bold">{windRel}</div>
                    </div>
                  )}
                </div>
              </div>

              {forecast.length > 0 && (
                <div className="card py-4">
                  <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Next 6 Hours</div>
                  <div className="grid grid-cols-6 gap-2 text-center text-xs">
                    {forecast.slice(0, 6).map((f) => {
                      const d = new Date(f.timestamp * 1000);
                      const hr = d.getHours();
                      return (
                        <div key={f.timestamp} className="rounded-lg bg-gray-800/60 px-1 py-2">
                          <div className="text-gray-500">{hr % 12 || 12}{hr < 12 ? "a" : "p"}</div>
                          <div className="font-bold text-white">{Math.round(f.weather.tempF)}°</div>
                          <div className="text-[10px] tabular-nums" style={{ color: f.color }}>{f.score.toFixed(1)}</div>
                          {f.weather.precipProb >= 30 && (
                            <div className="text-[10px] text-sky-400">{f.weather.precipProb}%</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="text-right text-[10px] text-gray-600">
                Updated {Math.round((Date.now() - weather.fetchedAt) / 1000)}s ago
                {weatherLoading && " · refreshing…"}
              </div>
            </>
          ) : (
            <div className="card py-12 text-center text-gray-500">
              {weatherLoading ? "Loading weather…" : "Waiting for first GPS fix to fetch weather…"}
            </div>
          )}
        </div>
      )}

      {/* Bottom controls — sticky on mobile */}
      <div className="sticky bottom-0 left-0 right-0 mt-6 -mx-3 sm:-mx-6 lg:-mx-8 border-t border-gray-800 bg-gray-950/95 backdrop-blur p-3 sm:p-4 flex items-center gap-2">
        {state === "idle" && (
          <>
            <button
              onClick={start}
              disabled={!current}
              className="btn-primary flex-1 py-4 text-base font-bold disabled:opacity-50"
            >
              {current ? "▶ Start Ride" : "Waiting for GPS…"}
            </button>
            <label className="flex items-center gap-1.5 text-xs text-gray-400 px-2">
              <input
                type="checkbox"
                checked={autoPause}
                onChange={(e) => setAutoPause(e.target.checked)}
                className="rounded accent-sky-500"
              />
              auto-pause
            </label>
          </>
        )}
        {state === "recording" && (
          <>
            <button onClick={pause} className="btn-secondary flex-1 py-4 text-base font-bold">‖ Pause</button>
            <button onClick={end} className="rounded-lg bg-red-600 hover:bg-red-500 text-white flex-1 py-4 text-base font-bold">■ End</button>
          </>
        )}
        {state === "paused" && (
          <>
            <button onClick={resume} className="btn-primary flex-1 py-4 text-base font-bold">▶ Resume</button>
            <button onClick={end} className="rounded-lg bg-red-600 hover:bg-red-500 text-white flex-1 py-4 text-base font-bold">■ End</button>
          </>
        )}
        {state === "ended" && (
          <>
            <Link href="/ride/history" className="btn-primary flex-1 py-4 text-base font-bold text-center">View Ride</Link>
            <button onClick={discardAndReset} className="btn-secondary flex-1 py-4 text-base font-bold">New Ride</button>
          </>
        )}
      </div>
    </div>
  );
}
