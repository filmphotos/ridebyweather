"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useWakeLock } from "@/lib/useWakeLock";
import {
  altDeltaFt,
  bearingDeg,
  fmtDuration,
  gradeColorClass,
  haversineM,
  liveGradePct,
  MS_TO_MPH,
  M_TO_FT,
  M_TO_MI,
  windRelativeTo,
  type TrackPoint,
  type WindRelative,
} from "@/lib/ride/rideMath";
import { saveRide, type RideRecord, type RideSport, type RideStop, type RideStopType } from "@/lib/ride/rideStorage";
import { addPhoto, requestPersistence } from "@/lib/photos/photoStore";
import { useBleSensors } from "@/lib/ride/useBleSensors";
import { useActivityReminders, type ReminderMode, type ReminderRule } from "@/lib/ride/useActivityReminders";
import type { GeoResult } from "@/app/api/geocode/route";
import WeatherAvatar from "@/components/WeatherAvatar/WeatherAvatar";
import LiveElevationProfile from "@/components/RouteMap/LiveElevationProfile";

const RideMap = dynamic(() => import("./RideMap"), { ssr: false });

type Tab = "stats" | "map" | "weather" | "devices";
type State = "idle" | "recording" | "paused" | "ended";

const SPORTS: Array<{ id: RideSport; label: string; emoji: string; verb: string; noun: string }> = [
  { id: "cycling", label: "Cycling", emoji: "🚴", verb: "Ride", noun: "ride" },
  { id: "running", label: "Running", emoji: "🏃", verb: "Run",  noun: "run"  },
  { id: "walking", label: "Walking", emoji: "🚶", verb: "Walk", noun: "walk" },
];

function isSport(v: unknown): v is RideSport {
  return v === "cycling" || v === "running" || v === "walking";
}

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
const LIVE_PING_MS = 8000;                         // push live-share position at most this often

export default function LiveRide() {
  // --- state --------------------------------------------------------------
  const searchParams = useSearchParams();
  const [sport, setSportState] = useState<RideSport>("cycling");
  const sportMeta = SPORTS.find((s) => s.id === sport) ?? SPORTS[0];

  // Hydrate sport from URL ?sport= then localStorage; persist on change
  useEffect(() => {
    const fromUrl = searchParams?.get("sport");
    if (isSport(fromUrl)) {
      setSportState(fromUrl);
      localStorage.setItem("rbw_sport", fromUrl);
      return;
    }
    const saved = localStorage.getItem("rbw_sport");
    if (isSport(saved)) setSportState(saved);
  }, [searchParams]);

  const setSport = (s: RideSport) => {
    setSportState(s);
    localStorage.setItem("rbw_sport", s);
  };

  const [state, setState] = useState<State>("idle");
  const [tab, setTab] = useState<Tab>("stats");
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [laps, setLaps] = useState<Array<{ t: number; distMi: number }>>([]);
  const [stops, setStops] = useState<RideStop[]>([]);
  const [showStopMenu, setShowStopMenu] = useState(false);
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

  // Weather — keyed off a `weatherLoc` that's independent of the GPS track,
  // so the panels still populate when location is denied or before the first fix.
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherLoc, setWeatherLoc] = useState<
    { lat: number; lng: number; name?: string; source: "gps" | "ip" | "search" } | null
  >(null);

  // Avatar gender — shared with /cycling via the same localStorage key
  const [gender, setGender] = useState<"male" | "female">("male");
  useEffect(() => {
    const saved = localStorage.getItem("rbw_gender");
    if (saved === "male" || saved === "female") setGender(saved);
  }, []);
  const updateGender = (g: "male" | "female") => {
    setGender(g);
    localStorage.setItem("rbw_gender", g);
  };

  // Manual city search (used as final fallback when GPS + IP both fail or the rider wants
  // weather for a different spot)
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs to avoid stale closures in geolocation callback
  const stateRef = useRef(state);
  const pointsRef = useRef<TrackPoint[]>([]);
  const lastMoveTRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const endedAtRef = useRef<number | null>(null);
  const lastWeatherFetchRef = useRef<{ t: number; lat: number; lng: number } | null>(null);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { pointsRef.current = points; }, [points]);

  const wakeLock = useWakeLock(state === "recording" || state === "paused");

  // Live accumulators in display units — also fed to the reminder engine.
  const distMi = totalDistM * M_TO_MI;
  const elapsedRefNow = state === "ended" && endedAtRef.current ? endedAtRef.current : now;
  const totalElapsedSec = startedAtRef.current ? (elapsedRefNow - startedAtRef.current) / 1000 : 0;

  // Bluetooth sensors (heart-rate strap, Varia radar, e-bike) + fuel reminders.
  const sensors = useBleSensors();
  const reminders = useActivityReminders(state === "recording", totalElapsedSec, distMi);

  // Mirror live HR into a ref so the geolocation callback can stamp each point.
  const hrRef = useRef<number | null>(null);
  useEffect(() => { hrRef.current = sensors.hr.bpm; }, [sensors.hr.bpm]);

  const updateReminder = (kind: "drink" | "eat", patch: Partial<ReminderRule>) =>
    reminders.setPrefs({ ...reminders.prefs, [kind]: { ...reminders.prefs[kind], ...patch } });

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

  // --- weather location fallback chain -----------------------------------
  // 1) GPS fixes from handlePosition set source: "gps" (preferred)
  // 2) If no GPS within ~3s OR geo errors, fall back to /api/geo-ip
  // 3) Manual search overrides everything
  const weatherLocRef = useRef(weatherLoc);
  useEffect(() => { weatherLocRef.current = weatherLoc; }, [weatherLoc]);

  const tryIpFallback = useCallback(async () => {
    // Don't clobber a GPS or user-picked location
    if (weatherLocRef.current && weatherLocRef.current.source !== "ip") return;
    if (weatherLocRef.current?.source === "ip") return;
    try {
      const res = await fetch("/api/geo-ip");
      if (!res.ok) return;
      const d = await res.json();
      if (typeof d.lat === "number" && typeof d.lng === "number") {
        // Functional setter: if GPS / search landed during the await, keep it.
        setWeatherLoc((prev) =>
          prev && prev.source !== "ip"
            ? prev
            : { lat: d.lat, lng: d.lng, name: d.name, source: "ip" }
        );
      }
    } catch {
      // best-effort
    }
  }, []);

  // Watchdog: if GPS hasn't produced a fix within 3s, try IP geo
  useEffect(() => {
    if (weatherLoc) return;
    const t = setTimeout(() => { tryIpFallback(); }, 3000);
    return () => clearTimeout(t);
  }, [weatherLoc, tryIpFallback]);

  // Fetch weather whenever the location source changes (throttled — first call always fires)
  useEffect(() => {
    if (!weatherLoc) return;
    maybeRefreshWeather(weatherLoc.lat, weatherLoc.lng);
  }, [weatherLoc, maybeRefreshWeather]);

  // --- geolocation handler -----------------------------------------------
  const handlePosition = useCallback(
    (pos: GeolocationPosition) => {
      const t = Date.now();
      const { latitude: lat, longitude: lng, speed, altitude, heading, accuracy } = pos.coords;

      // GPS is the highest-priority weather location source — override IP if we now have a fix
      if (!weatherLocRef.current || weatherLocRef.current.source === "ip") {
        setWeatherLoc({ lat, lng, source: "gps" });
      }
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
        hrBpm: hrRef.current ?? undefined,
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

      // Live-share ping — throttled; only while a share is active.
      if (shareTokenRef.current && t - lastPingTRef.current > LIVE_PING_MS) {
        lastPingTRef.current = t;
        const elapsed = startedAtRef.current ? Math.round((t - startedAtRef.current) / 1000) : 0;
        fetch("/api/live/ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: shareTokenRef.current,
            lat,
            lng,
            speedMph: (derivedSpeedMs ?? 0) * MS_TO_MPH,
            headingDeg: heading != null ? ((heading % 360) + 360) % 360 : undefined,
            distanceMi: totalDistMRef.current * M_TO_MI,
            elapsedSec: elapsed,
          }),
        }).catch(() => {});
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
  const stopsRef = useRef<RideStop[]>([]);
  const shareTokenRef = useRef<string | null>(null);
  const lastPingTRef = useRef(0);

  const markStop = useCallback((type: RideStopType) => {
    const last = pointsRef.current[pointsRef.current.length - 1];
    if (!last) return;
    const t = Date.now();
    const stop: RideStop = {
      id: `stop_${t}`,
      t,
      lat: last.lat,
      lng: last.lng,
      type,
    };
    const next = [...stopsRef.current, stop];
    stopsRef.current = next;
    setStops(next);
    setShowStopMenu(false);
  }, []);

  // --- start watching position ASAP for a "ready" feel -------------------
  useEffect(() => {
    if (!geoSupported) return;
    const id = navigator.geolocation.watchPosition(
      handlePosition,
      (err) => {
        setError(err.message);
        // Geo denied/failed — fall back to IP geo right away so weather still loads
        tryIpFallback();
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    );
    watchIdRef.current = id;
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [handlePosition, geoSupported, tryIpFallback]);

  // --- geocode search (debounced) ----------------------------------------
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(value)}`);
        const json = await res.json();
        setSuggestions(json.results ?? []);
        setShowSuggestions(true);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  const selectLocation = (result: GeoResult) => {
    setWeatherLoc({ lat: result.lat, lng: result.lng, name: result.display, source: "search" });
    setQuery(result.display);
    setSuggestions([]);
    setShowSuggestions(false);
    // Force a fresh fetch even if we just fetched (different location now)
    lastWeatherFetchRef.current = null;
  };

  // --- live sharing + SOS -------------------------------------------------
  const [shareState, setShareState] = useState<"idle" | "starting" | "active" | "error">("idle");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [sosState, setSosState] = useState<"idle" | "sending" | "sent" | "error" | "none">("idle");

  const startShare = useCallback(async () => {
    setShareState("starting");
    try {
      const res = await fetch("/api/live/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sport }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      shareTokenRef.current = d.token;
      setShareUrl(d.watchUrl);
      setShareState("active");
      lastPingTRef.current = 0; // push on the next GPS fix
    } catch {
      setShareState("error");
    }
  }, [sport]);

  const endShareIfActive = useCallback(() => {
    const tok = shareTokenRef.current;
    shareTokenRef.current = null;
    setShareState("idle");
    setShareUrl(null);
    if (tok) {
      fetch("/api/live/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tok, ended: true }),
      }).catch(() => {});
    }
  }, []);

  const copyShareLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {}
  }, [shareUrl]);

  const shareLink = useCallback(async () => {
    if (!shareUrl) return;
    const nav = navigator as Navigator & { share?: (d: { title?: string; url?: string }) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: "Follow my ride live", url: shareUrl });
        return;
      } catch {}
    }
    copyShareLink();
  }, [shareUrl, copyShareLink]);

  const triggerSos = useCallback(async () => {
    const cur = pointsRef.current[pointsRef.current.length - 1];
    let lat = cur?.lat;
    let lng = cur?.lng;
    if (lat == null || lng == null) {
      const wl = weatherLocRef.current;
      if (wl) { lat = wl.lat; lng = wl.lng; }
    }
    if (lat == null || lng == null) { setSosState("error"); return; }
    if (!window.confirm("Send an emergency SOS to your contacts with your current location?")) return;
    setSosState("sending");
    try {
      const res = await fetch("/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat,
          lng,
          token: shareTokenRef.current ?? undefined,
          at: new Date().toLocaleString(undefined, { timeZoneName: "short" }),
        }),
      });
      if (!res.ok) { setSosState(res.status === 400 ? "none" : "error"); return; }
      setSosState("sent");
      setTimeout(() => setSosState("idle"), 6000);
    } catch {
      setSosState("error");
    }
  }, []);

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
    stopsRef.current = [];
    setTotalDistM(0);
    setMovingTimeS(0);
    setAscentFt(0);
    setDescentFt(0);
    setMaxSpeedMs(0);
    setLaps([]);
    setStops([]);
    setPhotoCount(0);
    startedAtRef.current = Date.now();
    endedAtRef.current = null;
    lastMoveTRef.current = Date.now();
    // Re-arm the GPS watch if a previous end() released it
    if (watchIdRef.current == null && geoSupported) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handlePosition,
        (err) => {
          setError(err.message);
          tryIpFallback();
        },
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
      );
    }
    setState("recording");
  };

  const pause = () => setState("paused");
  const resume = () => {
    lastMoveTRef.current = Date.now();
    setState("recording");
  };

  const stopWatch = () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const end = () => {
    const endedAt = Date.now();
    endedAtRef.current = endedAt;
    endShareIfActive();

    if (!startedAtRef.current || pointsRef.current.length < 2) {
      // Nothing worth saving — go back to idle but keep the GPS watch alive
      // and preserve the preview point so Start re-enables for another try.
      startedAtRef.current = null;
      endedAtRef.current = null;
      setState("idle");
      setPoints((prev) => (prev.length > 0 ? [prev[prev.length - 1]] : []));
      return;
    }
    // Successful save — release GPS so the device stops tracking once the activity is over
    stopWatch();
    const startedAt = startedAtRef.current;
    const totalTimeSec = (endedAt - startedAt) / 1000;
    const rideDistMi = totalDistMRef.current * M_TO_MI;
    const rideAvgMph = movingTimeRef.current > 0 ? (totalDistMRef.current / movingTimeRef.current) * MS_TO_MPH : 0;
    const hrSamples = pointsRef.current
      .map((p) => p.hrBpm)
      .filter((x): x is number => typeof x === "number");
    const ride: RideRecord = {
      id: `ride_${startedAt}`,
      startedAt,
      endedAt,
      sport,
      points: pointsRef.current,
      laps: lapsRef.current,
      stops: stopsRef.current,
      totalDistMi: rideDistMi,
      movingTimeSec: movingTimeRef.current,
      totalTimeSec,
      avgSpeedMph: rideAvgMph,
      maxSpeedMph: maxSpeedRef.current * MS_TO_MPH,
      ascentFt: ascentRef.current,
      descentFt: descentRef.current,
      avgHrBpm: hrSamples.length ? Math.round(hrSamples.reduce((a, b) => a + b, 0) / hrSamples.length) : undefined,
      maxHrBpm: hrSamples.length ? Math.max(...hrSamples) : undefined,
    };
    saveRide(ride);
    setState("ended");
  };

  const discardAndReset = () => {
    endShareIfActive();
    setState("idle");
    setPoints((prev) => prev.length > 0 ? [prev[prev.length - 1]] : []);
    totalDistMRef.current = 0;
    movingTimeRef.current = 0;
    ascentRef.current = 0;
    descentRef.current = 0;
    maxSpeedRef.current = 0;
    lapsRef.current = [];
    stopsRef.current = [];
    startedAtRef.current = null;
    endedAtRef.current = null;
    setTotalDistM(0); setMovingTimeS(0); setAscentFt(0); setDescentFt(0); setMaxSpeedMs(0); setLaps([]); setStops([]);
  };

  // --- derived values for display ----------------------------------------
  const current = points[points.length - 1];
  const currentSpeedMph = current?.speedMs != null ? current.speedMs * MS_TO_MPH : 0;
  const avgMph = movingTimeS > 0 ? (totalDistM / movingTimeS) * MS_TO_MPH : 0;
  const altFt = current?.altM != null ? current.altM * M_TO_FT : null;

  // Live road grade (%) estimated from recent GPS elevation.
  const gradePct = useMemo(() => liveGradePct(points), [points]);

  // Climb tracker — banner pops while sustaining ≥3% grade, showing gain so far.
  const climbStartAltRef = useRef<number | null>(null);
  const [climb, setClimb] = useState<{ gradePct: number; gainFt: number } | null>(null);
  useEffect(() => {
    if (state !== "recording") {
      climbStartAltRef.current = null;
      setClimb(null);
      return;
    }
    const altM = current?.altM;
    if (gradePct == null || altM == null) return;
    if (gradePct >= 3) {
      if (climbStartAltRef.current == null) climbStartAltRef.current = altM;
      setClimb({ gradePct, gainFt: Math.max(0, (altM - climbStartAltRef.current) * M_TO_FT) });
    } else if (gradePct < 1.5) {
      climbStartAltRef.current = null;
      setClimb(null);
    }
  }, [gradePct, current, state]);

  const nearestThreatM = sensors.radar.threats[0]?.distanceM ?? null;

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

  // Heat stroke warning — NWS heat-index categories applied to "feels like" temp.
  // ≥125°F = Extreme Danger (heat stroke imminent), ≥103°F = Danger (heat stroke
  // possible with physical activity — which is exactly what the user is doing).
  const heatAlert = useMemo(() => {
    if (!weather) return null;
    const feels = weather.feelsLikeF;
    if (feels >= 125) {
      return { level: "extreme" as const, feels, label: "EXTREME HEAT — STOP NOW" };
    }
    if (feels >= 103) {
      return { level: "danger" as const, feels, label: "HEAT STROKE WARNING" };
    }
    return null;
  }, [weather]);

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
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowStopMenu((v) => !v)}
                className="inline-flex items-center gap-1 rounded-md border border-gray-700 bg-gray-800 hover:bg-gray-700 px-2 py-1 text-gray-300"
                aria-label="Mark a stop on this ride"
                aria-expanded={showStopMenu}
              >
                <span>📍</span>
                <span className="text-[11px]">
                  {stops.length > 0 ? `Stop (${stops.length})` : "Mark Stop"}
                </span>
              </button>
              {showStopMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 rounded-lg border border-gray-700 bg-gray-900 shadow-xl overflow-hidden text-xs min-w-[140px]">
                  <button
                    type="button"
                    onClick={() => markStop("food")}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-200 hover:bg-gray-800"
                  >
                    <span>🍔</span> Food
                  </button>
                  <button
                    type="button"
                    onClick={() => markStop("bathroom")}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-200 hover:bg-gray-800 border-t border-gray-800"
                  >
                    <span>🚻</span> Bathroom
                  </button>
                  <button
                    type="button"
                    onClick={() => markStop("other")}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-200 hover:bg-gray-800 border-t border-gray-800"
                  >
                    <span>📍</span> Other stop
                  </button>
                </div>
              )}
            </div>
          )}
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

      {/* Sport picker — locked in once recording starts so mid-activity stats stay consistent */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-gray-500">Activity</span>
        <div className="inline-flex rounded-lg border border-gray-800 bg-gray-900 p-0.5 text-xs">
          {SPORTS.map((s) => {
            const active = sport === s.id;
            const locked = state !== "idle";
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => !locked && setSport(s.id)}
                disabled={locked && !active}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  active ? "bg-sky-500 text-white"
                  : locked ? "text-gray-700 cursor-not-allowed"
                  : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <span className="mr-1">{s.emoji}</span>{s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Safety bar — live sharing + SOS, available once an activity is underway */}
      {state !== "idle" && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {shareState === "active" ? (
            <>
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 text-emerald-400 px-2.5 py-1.5 text-xs font-semibold">
                ● Sharing live
              </span>
              <button
                type="button"
                onClick={shareLink}
                className="rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 px-2.5 py-1.5 text-xs text-gray-200"
              >
                {shareCopied ? "Copied ✓" : "Share link"}
              </button>
              <button
                type="button"
                onClick={endShareIfActive}
                className="rounded-lg border border-gray-700 px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-200"
              >
                Stop
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={startShare}
              disabled={shareState === "starting"}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 px-2.5 py-1.5 text-xs text-gray-200 disabled:opacity-50"
            >
              📡 {shareState === "starting" ? "Starting…" : shareState === "error" ? "Retry share" : "Share live"}
            </button>
          )}
          <button
            type="button"
            onClick={triggerSos}
            disabled={sosState === "sending"}
            className="ml-auto inline-flex items-center gap-1 rounded-lg bg-red-600/90 hover:bg-red-500 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
          >
            🆘 {sosState === "sending" ? "Sending…" : sosState === "sent" ? "Sent ✓" : "SOS"}
          </button>
        </div>
      )}

      {shareState === "active" && shareUrl && (
        <div className="mb-3 rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-xs text-gray-400 break-all">
          Anyone with this link can watch live: <span className="text-gray-200">{shareUrl}</span>
        </div>
      )}
      {sosState === "none" && (
        <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          No emergency contacts with an email yet. Add one in{" "}
          <Link href="/settings" className="underline">Settings</Link>.
        </div>
      )}
      {sosState === "sent" && (
        <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          SOS sent to your emergency contacts.
        </div>
      )}
      {sosState === "error" && (
        <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          Couldn&apos;t send SOS. Check your connection and try again.
        </div>
      )}

      {error && !weatherLoc && (
        <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-400 text-sm">
          {error}
        </div>
      )}
      {error && weatherLoc && weatherLoc.source !== "gps" && (
        <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-300 text-sm">
          GPS unavailable — showing weather for <span className="font-semibold">{weatherLoc.name ?? "your approximate location"}</span>.
          Enable location to record distance, speed, and route.
        </div>
      )}

      {/* Weather location picker — visible whenever weather is showing */}
      <div ref={searchRef} className="relative mb-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={weatherLoc?.name ? `Weather for ${weatherLoc.name} — search to change…` : "Search a city for weather…"}
            className="w-full rounded-lg bg-gray-900 border border-gray-800 pl-3 pr-9 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500"
          />
          {searchLoading && (
            <div className="absolute right-3 top-2.5 h-4 w-4 animate-spin rounded-full border-2 border-gray-700 border-t-sky-400" />
          )}
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-gray-700 bg-gray-900 shadow-xl overflow-hidden">
            {suggestions.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  onMouseDown={() => selectLocation(r)}
                  className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-800 transition-colors"
                >
                  <span className="font-medium">{r.name}</span>
                  {r.display !== r.name && (
                    <span className="ml-1.5 text-gray-500 text-xs">
                      {r.display.replace(r.name + ", ", "")}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!geoSupported && (
        <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-400 text-sm">
          Your browser doesn&apos;t expose location. Try Chrome / Safari on mobile.
        </div>
      )}

      {sensors.radar.connected && nearestThreatM != null && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-3 rounded-xl border-2 border-red-500 bg-red-500/15 p-3 text-red-300 text-sm font-bold flex items-center gap-2 animate-pulse"
        >
          <span className="text-lg leading-none">🚗</span>
          <div className="flex-1">
            VEHICLE APPROACHING
            <span className="ml-2 font-normal text-red-200">
              nearest {Math.round(nearestThreatM)} m
              {sensors.radar.threats.length > 1 ? ` · ${sensors.radar.threats.length} vehicles` : ""}
            </span>
          </div>
        </div>
      )}

      {heatAlert && (
        <div
          role="alert"
          aria-live="assertive"
          className="animate-heat-flash mb-3 rounded-xl border-2 p-3 text-white text-sm font-bold flex items-start gap-2"
        >
          <span className="text-lg leading-none">🥵</span>
          <div className="flex-1">
            <div className="uppercase tracking-wider">{heatAlert.label}</div>
            <div className="text-xs font-normal text-red-50 mt-0.5">
              Feels like {Math.round(heatAlert.feels)}°F.{" "}
              {heatAlert.level === "extreme"
                ? "End your activity, get to shade and hydrate immediately."
                : "Slow down, hydrate, find shade. Heat stroke risk during exertion."}
            </div>
          </div>
        </div>
      )}

      {rainAlert && (
        <div className="mb-3 rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-sky-300 text-sm">
          ☔ {rainAlert}
        </div>
      )}

      {climb && (
        <div className="mb-3 rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-orange-300 text-sm flex items-center gap-2">
          <span className="text-lg leading-none">⛰️</span>
          <div className="flex-1">
            <span className="font-bold">Climbing {climb.gradePct.toFixed(1)}%</span>
            <span className="ml-2 text-orange-200/80">+{Math.round(climb.gainFt)} ft this climb</span>
          </div>
        </div>
      )}

      {reminders.active && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-3 rounded-xl border border-sky-500/40 bg-sky-500/10 p-3 text-sky-200 text-sm flex items-center gap-2"
        >
          <span className="text-lg leading-none">{reminders.active.kind === "drink" ? "💧" : "🍔"}</span>
          <div className="flex-1 font-semibold">
            {reminders.active.kind === "drink"
              ? "Time to hydrate — take a drink"
              : "Fuel up — time to eat something"}
          </div>
          <button
            type="button"
            onClick={reminders.dismiss}
            className="rounded-md border border-white/15 px-2 py-1 text-xs text-gray-200 hover:bg-white/10"
          >
            Got it
          </button>
        </div>
      )}

      {/* Live sensor chips — visible on any tab once data is flowing */}
      {(sensors.hr.connected || sensors.ebike.connected || sensors.radar.connected || gradePct != null) && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          {gradePct != null && (
            <span className="inline-flex items-center gap-1 rounded-full border border-gray-800 bg-gray-900 px-2.5 py-1">
              <span className="text-gray-500">Grade</span>
              <span className={`font-bold tabular-nums ${gradeColorClass(gradePct)}`}>
                {gradePct > 0 ? "+" : ""}{gradePct.toFixed(1)}%
              </span>
            </span>
          )}
          {sensors.hr.connected && (
            <span className="inline-flex items-center gap-1 rounded-full border border-gray-800 bg-gray-900 px-2.5 py-1">
              <span className="text-red-400">❤️</span>
              <span className="font-bold tabular-nums text-white">{sensors.hr.bpm ?? "—"}</span>
              <span className="text-gray-500">bpm</span>
            </span>
          )}
          {sensors.ebike.connected && sensors.ebike.batteryPct != null && (
            <span className="inline-flex items-center gap-1 rounded-full border border-gray-800 bg-gray-900 px-2.5 py-1">
              <span className="text-emerald-400">🔋</span>
              <span className="font-bold tabular-nums text-white">{sensors.ebike.batteryPct}%</span>
            </span>
          )}
          {sensors.ebike.connected && sensors.ebike.powerW != null && (
            <span className="inline-flex items-center gap-1 rounded-full border border-gray-800 bg-gray-900 px-2.5 py-1">
              <span className="text-amber-400">⚡</span>
              <span className="font-bold tabular-nums text-white">{sensors.ebike.powerW}</span>
              <span className="text-gray-500">W</span>
            </span>
          )}
          {sensors.radar.connected && (
            <span className="inline-flex items-center gap-1 rounded-full border border-gray-800 bg-gray-900 px-2.5 py-1">
              <span>📡</span>
              <span className={nearestThreatM != null ? "font-bold text-red-400" : "text-gray-400"}>
                {nearestThreatM != null ? `${Math.round(nearestThreatM)} m` : "clear"}
              </span>
            </span>
          )}
        </div>
      )}

      {/* Tab bar */}
      <div className="mb-4 flex gap-1 rounded-xl border border-gray-800 bg-gray-900 p-1 text-sm">
        {(["stats", "map", "weather", "devices"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-3 py-2 font-medium transition-colors ${
              tab === t ? "bg-sky-500 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {t === "stats" ? "Stats" : t === "map" ? "Map" : t === "weather" ? "Weather" : "Devices"}
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

          {/* Grade + connected sensors */}
          {(gradePct != null || sensors.hr.connected || (sensors.ebike.connected && sensors.ebike.batteryPct != null)) && (
            <div className="grid grid-cols-3 gap-3">
              {gradePct != null && (
                <div className="card py-4">
                  <div className="text-[10px] uppercase tracking-widest text-gray-500">Grade</div>
                  <div className={`text-2xl font-bold tabular-nums mt-1 ${gradeColorClass(gradePct)}`}>
                    {gradePct > 0 ? "+" : ""}{gradePct.toFixed(1)}
                    <span className="ml-0.5 text-xs text-gray-500 font-normal">%</span>
                  </div>
                </div>
              )}
              {sensors.hr.connected && (
                <div className="card py-4">
                  <div className="text-[10px] uppercase tracking-widest text-red-400">❤️ Heart Rate</div>
                  <div className="text-2xl font-bold tabular-nums text-white mt-1">
                    {sensors.hr.bpm ?? "—"}
                    <span className="ml-0.5 text-xs text-gray-500 font-normal">bpm</span>
                  </div>
                </div>
              )}
              {sensors.ebike.connected && sensors.ebike.batteryPct != null && (
                <div className="card py-4">
                  <div className="text-[10px] uppercase tracking-widest text-emerald-400">🔋 E-bike</div>
                  <div className="text-2xl font-bold tabular-nums text-white mt-1">
                    {sensors.ebike.batteryPct}
                    <span className="ml-0.5 text-xs text-gray-500 font-normal">%</span>
                  </div>
                  {sensors.ebike.powerW != null && (
                    <div className="text-[10px] text-amber-400 mt-0.5">{sensors.ebike.powerW} W</div>
                  )}
                </div>
              )}
            </div>
          )}

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
        <>
          <div className="card overflow-hidden p-0">
            <RideMap
              points={points}
              heading={heading}
              windDirDeg={weather?.windDirDeg}
              windSpeedMph={weather?.windSpeedMph}
            />
          </div>
          {/* Live elevation + gradient — derived from GPS altitudes, no API call */}
          <LiveElevationProfile points={points} />
        </>
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

              <div className="flex items-center justify-end gap-2">
                <span className="text-xs text-gray-500">Avatar:</span>
                <div className="inline-flex rounded-lg border border-gray-800 bg-gray-900 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => updateGender("male")}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      gender === "male" ? "bg-sky-500 text-white" : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    Male
                  </button>
                  <button
                    type="button"
                    onClick={() => updateGender("female")}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      gender === "female" ? "bg-sky-500 text-white" : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    Female
                  </button>
                </div>
              </div>
              <WeatherAvatar
                tempF={weather.tempF}
                precipProb={weather.precipProb}
                windSpeedMph={weather.windSpeedMph}
                gender={gender}
                sport={sport}
              />

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

      {/* === DEVICES === */}
      {tab === "devices" && (
        <div className="space-y-3">
          {/* Bluetooth sensors */}
          <div className="card py-4">
            <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">Bluetooth Sensors</div>
            {!sensors.supported ? (
              <p className="text-sm text-gray-400">
                Web Bluetooth isn&apos;t available in this browser. Use Chrome or Edge on Android or
                desktop (over HTTPS) to pair a heart-rate strap, Garmin Varia radar, or e-bike.
              </p>
            ) : (
              <div className="space-y-2">
                {/* Heart-rate strap */}
                <div className="flex items-center justify-between rounded-lg bg-gray-800/50 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">❤️</span>
                    <div>
                      <div className="text-sm font-medium text-gray-200">Heart-rate strap</div>
                      <div className="text-xs text-gray-500">
                        {sensors.hr.connected
                          ? `${sensors.hr.deviceName ?? "Connected"} · ${sensors.hr.bpm ?? "—"} bpm`
                          : "Any standard BLE heart-rate monitor"}
                      </div>
                    </div>
                  </div>
                  {sensors.hr.connected ? (
                    <button onClick={sensors.disconnectHr} className="rounded-md border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700">Disconnect</button>
                  ) : (
                    <button onClick={sensors.connectHr} disabled={sensors.hr.connecting} className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50">
                      {sensors.hr.connecting ? "Pairing…" : "Connect"}
                    </button>
                  )}
                </div>

                {/* Garmin Varia radar */}
                <div className="flex items-center justify-between rounded-lg bg-gray-800/50 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📡</span>
                    <div>
                      <div className="text-sm font-medium text-gray-200">Bike radar</div>
                      <div className="text-xs text-gray-500">
                        {sensors.radar.connected
                          ? `${sensors.radar.deviceName ?? "Connected"} · ${sensors.radar.threats.length > 0 ? `${sensors.radar.threats.length} approaching` : "all clear"}`
                          : "Garmin Varia & compatible rear radar"}
                      </div>
                    </div>
                  </div>
                  {sensors.radar.connected ? (
                    <button onClick={sensors.disconnectRadar} className="rounded-md border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700">Disconnect</button>
                  ) : (
                    <button onClick={sensors.connectRadar} disabled={sensors.radar.connecting} className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50">
                      {sensors.radar.connecting ? "Pairing…" : "Connect"}
                    </button>
                  )}
                </div>

                {/* E-bike */}
                <div className="flex items-center justify-between rounded-lg bg-gray-800/50 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🚲</span>
                    <div>
                      <div className="text-sm font-medium text-gray-200">E-bike / power meter</div>
                      <div className="text-xs text-gray-500">
                        {sensors.ebike.connected
                          ? `${sensors.ebike.deviceName ?? "Connected"}${sensors.ebike.batteryPct != null ? ` · ${sensors.ebike.batteryPct}% battery` : ""}${sensors.ebike.powerW != null ? ` · ${sensors.ebike.powerW} W` : ""}`
                          : "Battery level & power where the bike exposes it"}
                      </div>
                    </div>
                  </div>
                  {sensors.ebike.connected ? (
                    <button onClick={sensors.disconnectEbike} className="rounded-md border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700">Disconnect</button>
                  ) : (
                    <button onClick={sensors.connectEbike} disabled={sensors.ebike.connecting} className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50">
                      {sensors.ebike.connecting ? "Pairing…" : "Connect"}
                    </button>
                  )}
                </div>
              </div>
            )}
            {sensors.error && <p className="mt-3 text-xs text-red-400">{sensors.error}</p>}
          </div>

          {/* Fuel & hydration reminders */}
          <div className="card py-4">
            <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">Fuel &amp; Hydration Reminders</div>
            <div className="space-y-3">
              {(["drink", "eat"] as const).map((kind) => {
                const rule = reminders.prefs[kind];
                return (
                  <div key={kind} className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 min-w-[110px]">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(e) => updateReminder(kind, { enabled: e.target.checked })}
                        className="rounded accent-sky-500"
                      />
                      <span className="text-sm text-gray-200">{kind === "drink" ? "💧 Drink" : "🍔 Eat"}</span>
                    </label>
                    <span className="text-xs text-gray-500">every</span>
                    <input
                      type="number"
                      min={1}
                      value={rule.value}
                      disabled={!rule.enabled}
                      onChange={(e) => updateReminder(kind, { value: Math.max(1, Number(e.target.value) || 1) })}
                      className="w-16 rounded-md bg-gray-900 border border-gray-800 px-2 py-1 text-sm text-gray-200 disabled:opacity-50"
                    />
                    <select
                      value={rule.mode}
                      disabled={!rule.enabled}
                      onChange={(e) => updateReminder(kind, { mode: e.target.value as ReminderMode })}
                      className="rounded-md bg-gray-900 border border-gray-800 px-2 py-1 text-sm text-gray-200 disabled:opacity-50"
                    >
                      <option value="time">min</option>
                      <option value="distance">mi</option>
                    </select>
                  </div>
                );
              })}
              <label className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  checked={reminders.prefs.sound}
                  onChange={(e) => reminders.setPrefs({ ...reminders.prefs, sound: e.target.checked })}
                  className="rounded accent-sky-500"
                />
                <span className="text-xs text-gray-400">Play a sound with each reminder</span>
              </label>
              <p className="text-[11px] text-gray-600">
                Reminders fire while you&apos;re recording — they vibrate{reminders.prefs.sound ? " and beep" : ""} and show on screen when due.
              </p>
            </div>
          </div>
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
              {current ? `▶ Start ${sportMeta.verb}` : "Waiting for GPS…"}
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
            <Link href="/ride/history" className="btn-primary flex-1 py-4 text-base font-bold text-center">View {sportMeta.verb}</Link>
            <button onClick={discardAndReset} className="btn-secondary flex-1 py-4 text-base font-bold">New {sportMeta.verb}</button>
          </>
        )}
      </div>
    </div>
  );
}
