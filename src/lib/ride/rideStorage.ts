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
// Ride ids we've successfully synced to the server. Lets us tell the
// difference between "new local ride that needs upload" and "ride that was
// deleted on another device" — both look like "local, not on server" without
// this hint. Without it, a delete on PC gets resurrected by the phone's next
// sync (the phone uploads what it thinks is a local-only ride).
const SYNCED_IDS_KEY = "rbw_rides_synced_ids_v1";
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

function loadSyncedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(SYNCED_IDS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeSyncedIds(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SYNCED_IDS_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
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
  // next time the history page loads. On success, mark the id as synced so a
  // later cross-device delete doesn't make this device re-upload it.
  uploadRide(ride)
    .then(() => {
      const ids = loadSyncedIds();
      ids.add(ride.id);
      writeSyncedIds(ids);
    })
    .catch(() => {});
}

/**
 * Delete a ride locally AND on the server. Async so the UI can wait on the
 * server delete before re-syncing — otherwise the next GET still returns the
 * ride and the merge step puts it right back ("delete then it came back").
 * Treat 404 as success (already gone). Throws on other failures so the UI
 * can show an error and keep the ride visible.
 */
export async function deleteRide(id: string): Promise<void> {
  if (typeof window === "undefined") return;

  // Server first. If this fails (and it's not a 404), bail out before we
  // touch local — that way the UI stays consistent and a retry will work.
  const res = await fetch(`/api/rides/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    let detail = "";
    try { detail = await res.text(); } catch {}
    throw new Error(`delete ${res.status}: ${detail.slice(0, 200)}`);
  }

  // Now the local side. Removing from syncedIds too — if the user happens to
  // re-create a ride with the same id later, it should look "new" again.
  const next = loadRides().filter((r) => r.id !== id);
  writeCache(next);
  const ids = loadSyncedIds();
  if (ids.delete(id)) writeSyncedIds(ids);
  // Cascade: photos are keyed by ride id in IndexedDB. Fire-and-forget — we don't
  // want a delete UI to wait on it, and orphan cleanup is harmless if it fails.
  deletePhotosForRide(id).catch(() => {});
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
  const syncedIds = loadSyncedIds();

  // Local rides missing from the server fall into two buckets:
  //   - never synced: brand-new ride this device recorded → upload it
  //   - previously synced: server says it's gone → deleted on another device,
  //     drop it from local instead of resurrecting it
  const toUpload = local.filter((r) => !serverIds.has(r.id) && !syncedIds.has(r.id));
  const deletedElsewhere = new Set(
    local.filter((r) => !serverIds.has(r.id) && syncedIds.has(r.id)).map((r) => r.id)
  );

  for (const r of toUpload) {
    try {
      await uploadRide(r);
      result.uploadedCount += 1;
      syncedIds.add(r.id);
    } catch (e) {
      result.uploadErrors.push(e instanceof Error ? e.message : String(e));
    }
  }

  // Merge: prefer the local cache's full record (it has `points`) when we
  // have it; otherwise use the server summary (its `points` will load on
  // demand). Skip ids the server says were deleted elsewhere.
  const byId = new Map<string, RideRecord>();
  for (const r of serverList) byId.set(r.id, r);
  for (const r of local) {
    if (deletedElsewhere.has(r.id)) continue;
    byId.set(r.id, r); // local wins (it has points)
  }
  // Anything still in the map IS on the server now (either it already was, or
  // we just uploaded it). Mark them all synced and drop syncedIds we no
  // longer need so the set doesn't grow forever.
  const liveIds = new Set(byId.keys());
  for (const id of liveIds) syncedIds.add(id);
  for (const id of Array.from(syncedIds)) {
    if (!liveIds.has(id)) syncedIds.delete(id);
  }
  writeSyncedIds(syncedIds);

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
