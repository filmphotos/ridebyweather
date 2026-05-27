// localStorage-backed ride history + GPX export.
// We do not POST to the server yet — keeps the live ride screen offline-friendly.

import type { TrackPoint } from "./rideMath";
import { deletePhotosForRide } from "@/lib/photos/photoStore";

const KEY = "rbw_rides_v1";
const MAX_RIDES = 30;

export type RideSport = "cycling" | "running" | "walking";

export type RideStopType = "food" | "bathroom" | "other";

export interface RideStop {
  id: string;          // stop_<t>
  t: number;           // unix ms — when the stop was logged
  lat: number;
  lng: number;
  type: RideStopType;
  note?: string;
}

export interface RideRecord {
  id: string;
  startedAt: number;
  endedAt: number;
  sport?: RideSport;
  points: TrackPoint[];
  laps: Array<{ t: number; distMi: number }>;
  stops?: RideStop[];
  totalDistMi: number;
  movingTimeSec: number;
  totalTimeSec: number;
  avgSpeedMph: number;     // moving avg
  maxSpeedMph: number;
  ascentFt: number;
  descentFt: number;
  notes?: string;
}

export function loadRides(): RideRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as RideRecord[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveRide(ride: RideRecord): void {
  if (typeof window === "undefined") return;
  const existing = loadRides();
  const next = [ride, ...existing.filter((r) => r.id !== ride.id)].slice(0, MAX_RIDES);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // quota exceeded — drop oldest until it fits
    while (next.length > 1) {
      next.pop();
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
        return;
      } catch {}
    }
  }
}

export function deleteRide(id: string): void {
  if (typeof window === "undefined") return;
  const next = loadRides().filter((r) => r.id !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
  // Cascade: photos are keyed by ride id in IndexedDB. Fire-and-forget — we don't
  // want a delete UI to wait on it, and orphan cleanup is harmless if it fails.
  deletePhotosForRide(id).catch(() => {});
}

export function rideToGpx(ride: RideRecord): string {
  const name = `RideByWeather — ${new Date(ride.startedAt).toLocaleString()}`;
  const trkpts = ride.points
    .map((p) => {
      const time = new Date(p.t).toISOString();
      const ele = p.altM != null ? `<ele>${p.altM.toFixed(1)}</ele>` : "";
      return `<trkpt lat="${p.lat}" lon="${p.lng}">${ele}<time>${time}</time></trkpt>`;
    })
    .join("");
  // GPX waypoints for stops — most tools (Strava, Garmin Connect) will show them
  const wpts = (ride.stops ?? [])
    .map((s) => {
      const time = new Date(s.t).toISOString();
      const label = s.type === "food" ? "Food stop"
        : s.type === "bathroom" ? "Bathroom stop"
        : "Stop";
      const desc = s.note ? `<desc>${escapeXml(s.note)}</desc>` : "";
      return `<wpt lat="${s.lat}" lon="${s.lng}"><time>${time}</time><name>${label}</name><type>${s.type}</type>${desc}</wpt>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RideByWeather" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${name}</name><time>${new Date(ride.startedAt).toISOString()}</time></metadata>
  ${wpts}
  <trk><name>${name}</name><trkseg>${trkpts}</trkseg></trk>
</gpx>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function downloadGpx(ride: RideRecord) {
  const xml = rideToGpx(ride);
  const blob = new Blob([xml], { type: "application/gpx+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ride-${new Date(ride.startedAt).toISOString().slice(0, 10)}.gpx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
