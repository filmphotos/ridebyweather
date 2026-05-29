// Ride history: localStorage cache + server sync.
//
// Local cache keeps the live ride screen offline-friendly and gives the
// history page an instant first paint. Anything written to the cache is also
// pushed to /api/rides so the user's rides follow them between devices
// (phone <-> PC). On page load we pull the server list and upload any
// local-only rides we have, so a device that recorded a ride before sync
// existed still gets it onto the server.

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
  avgHrBpm?: number;       // from a paired BLE heart-rate strap
  maxHrBpm?: number;
  notes?: string;
}

// Summary as returned by GET /api/rides — same shape as RideRecord but with
// an empty `points` array, since the list endpoint omits the heavy track.
export type RideSummary = Omit<RideRecord, "points"> & { points: TrackPoint[] };

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

function writeCache(rides: RideRecord[]): void {
  if (typeof window === "undefined") return;
  const trimmed = rides.slice(0, MAX_RIDES);
  try {
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    // quota exceeded — drop oldest until it fits
    while (trimmed.length > 1) {
      trimmed.pop();
      try {
        localStorage.setItem(KEY, JSON.stringify(trimmed));
        return;
      } catch {}
    }
  }
}

export function saveRide(ride: RideRecord): void {
  if (typeof window === "undefined") return;
  const existing = loadRides();
  const next = [ride, ...existing.filter((r) => r.id !== ride.id)];
  writeCache(next);
  // Fire-and-forget — the ride is already safe in localStorage. If the
  // upload fails (offline, server down), syncRidesFromServer() will retry it
  // next time the history page loads.
  uploadRide(ride).catch(() => {});
}

export function deleteRide(id: string): void {
  if (typeof window === "undefined") return;
  const next = loadRides().filter((r) => r.id !== id);
  writeCache(next);
  // Cascade: photos are keyed by ride id in IndexedDB. Fire-and-forget — we don't
  // want a delete UI to wait on it, and orphan cleanup is harmless if it fails.
  deletePhotosForRide(id).catch(() => {});
  // Also remove from the server. Ignore 404 (already gone) and other errors.
  fetch(`/api/rides/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
}

async function uploadRide(ride: RideRecord): Promise<void> {
  const res = await fetch("/api/rides", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ride),
  });
  if (!res.ok) {
    // Surface upload failures in the browser console so a stuck ride is
    // diagnosable. We don't throw — saveRide is fire-and-forget and the ride
    // is already safe in localStorage; the next sync will retry.
    let detail = "";
    try { detail = await res.text(); } catch {}
    console.warn(`[rideStorage] upload failed ${res.status}: ${detail.slice(0, 300)}`);
  }
}

/**
 * Pull the server's ride list, upload any rides we have locally that the
 * server doesn't, and reconcile the local cache. Returns the merged list,
 * newest first. Falls back to cache on network error so the history page
 * still works offline.
 *
 * Server returns summaries (no `points`) — those rides will lazy-load their
 * track when the user opens the detail modal (see loadRideDetail).
 */
export async function syncRidesFromServer(): Promise<RideRecord[]> {
  const local = loadRides();

  let serverList: RideRecord[] = [];
  try {
    const res = await fetch("/api/rides", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { rides?: RideRecord[] };
    serverList = Array.isArray(data.rides) ? data.rides : [];
  } catch {
    return local;
  }

  const serverIds = new Set(serverList.map((r) => r.id));
  const localOnly = local.filter((r) => !serverIds.has(r.id));

  // Upload anything the server is missing. Sequential so we don't slam the
  // API with a burst on first sync; the typical user has < 30 rides.
  for (const r of localOnly) {
    try {
      await uploadRide(r);
    } catch {
      // Keep the ride in the cache so we'll retry on next sync.
    }
  }

  // Merge: prefer the local cache's full record (it has `points`) when we
  // have it; otherwise use the server summary (its `points` will load on
  // demand). De-dupe by id and sort newest first.
  const byId = new Map<string, RideRecord>();
  for (const r of serverList) byId.set(r.id, r);
  for (const r of local) byId.set(r.id, r); // local wins (it has points)

  const merged = Array.from(byId.values()).sort((a, b) => b.startedAt - a.startedAt);
  writeCache(merged);
  return merged;
}

/**
 * Fetch a single ride's full record (with `points`) from the server.
 * Used by the history detail modal when the cached record lacks points.
 */
export async function loadRideDetail(id: string): Promise<RideRecord | null> {
  try {
    const res = await fetch(`/api/rides/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { ride?: RideRecord };
    return data.ride ?? null;
  } catch {
    return null;
  }
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
  // GPX waypoints for stops — most tools (Garmin Connect) will show them
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
