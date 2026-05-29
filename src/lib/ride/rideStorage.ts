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
    let detail = "";
    try { detail = await res.text(); } catch {}
    const msg = `upload ${res.status}: ${detail.slice(0, 300)}`;
    console.warn(`[rideStorage] ${msg}`);
    throw new Error(msg);
  }
}

export interface SyncResult {
  rides: RideRecord[];
  localCount: number;
  serverCount: number;
  uploadedCount: number;
  uploadErrors: string[];   // human-readable per-ride error messages
  fetchError?: string;      // set if GET /api/rides failed entirely
}

/**
 * Pull the server's ride list, upload any rides we have locally that the
 * server doesn't, and reconcile the local cache. Returns the merged list
 * (newest first) plus diagnostic counts/errors the UI can surface.
 *
 * Server returns summaries (no `points`) — those rides will lazy-load their
 * track when the user opens the detail modal (see loadRideDetail).
 */
export async function syncRidesFromServer(): Promise<SyncResult> {
  const local = loadRides();
  const result: SyncResult = {
    rides: local,
    localCount: local.length,
    serverCount: 0,
    uploadedCount: 0,
    uploadErrors: [],
  };

  let serverList: RideRecord[] = [];
  try {
    const res = await fetch("/api/rides", { cache: "no-store" });
    if (!res.ok) {
      let detail = "";
      try { detail = await res.text(); } catch {}
      throw new Error(`${res.status}: ${detail.slice(0, 200)}`);
    }
    const data = (await res.json()) as { rides?: RideRecord[] };
    serverList = Array.isArray(data.rides) ? data.rides : [];
    result.serverCount = serverList.length;
  } catch (e) {
    result.fetchError = e instanceof Error ? e.message : String(e);
    return result;
  }

  const serverIds = new Set(serverList.map((r) => r.id));
  const localOnly = local.filter((r) => !serverIds.has(r.id));

  for (const r of localOnly) {
    try {
      await uploadRide(r);
      result.uploadedCount += 1;
    } catch (e) {
      result.uploadErrors.push(e instanceof Error ? e.message : String(e));
    }
  }

  // Merge: prefer the local cache's full record (it has `points`) when we
  // have it; otherwise use the server summary (its `points` will load on
  // demand). De-dupe by id and sort newest first.
  const byId = new Map<string, RideRecord>();
  for (const r of serverList) byId.set(r.id, r);
  for (const r of local) byId.set(r.id, r); // local wins (it has points)

  result.rides = Array.from(byId.values()).sort((a, b) => b.startedAt - a.startedAt);
  writeCache(result.rides);
  return result;
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
