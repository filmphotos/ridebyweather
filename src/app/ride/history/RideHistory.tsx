"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  deleteRide,
  downloadGpx,
  loadRideDetail,
  loadRides,
  syncRidesFromServer,
  type RideRecord,
  type SyncResult,
} from "@/lib/ride/rideStorage";
import { fmtDuration } from "@/lib/ride/rideMath";
import RidePhotos from "@/components/RidePhotos/RidePhotos";

const RideRouteMap = dynamic(() => import("./RideRouteMap"), { ssr: false });

export default function RideHistory() {
  const [rides, setRides] = useState<RideRecord[]>([]);
  const [selected, setSelected] = useState<RideRecord | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncInfo, setSyncInfo] = useState<SyncResult | null>(null);

  async function runSync() {
    setSyncing(true);
    try {
      const r = await syncRidesFromServer();
      setRides(r.rides);
      setSyncInfo(r);
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    // Instant first paint from the local cache, then sync with the server
    // (uploads any local-only rides and pulls down rides recorded on other
    // devices). Server is the source of truth; cache is just for offline.
    setRides(loadRides());
    runSync();
  }, []);

  async function openRide(ride: RideRecord) {
    // List entries from the server come without `points` — lazy-load the
    // full track so the route map can render.
    if (!ride.points || ride.points.length === 0) {
      const full = await loadRideDetail(ride.id);
      setSelected(full ?? ride);
      return;
    }
    setSelected(ride);
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this ride?")) return;
    deleteRide(id);
    setRides(loadRides());
    if (selected?.id === id) setSelected(null);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Ride History</h1>
          <p className="text-sm text-gray-500 mt-1">
            {syncing ? "Syncing…" : "Synced across your devices."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runSync}
            disabled={syncing}
            className="rounded-lg border border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 text-sm px-3 py-2 transition-colors disabled:opacity-50"
            title="Re-sync with server"
          >
            {syncing ? "Syncing…" : "Sync"}
          </button>
          <Link href="/ride" className="btn-primary text-sm px-4 py-2">Start New Ride</Link>
        </div>
      </div>

      {/* Sync diagnostics — visible so we can see what's going on without
          opening browser devtools. Hidden in the happy path (nothing to
          report). */}
      {syncInfo && !syncing && (syncInfo.fetchError || syncInfo.uploadErrors.length > 0 || syncInfo.uploadedCount > 0 || (syncInfo.localCount === 0 && syncInfo.serverCount === 0)) && (
        <div className="mb-4 rounded-lg border border-gray-800 bg-gray-900/50 p-3 text-xs">
          <div className="text-gray-400">
            <span className="text-gray-500">Sync:</span>{" "}
            local <span className="text-gray-200">{syncInfo.localCount}</span> ·{" "}
            server <span className="text-gray-200">{syncInfo.serverCount}</span>
            {syncInfo.uploadedCount > 0 && (
              <> · uploaded <span className="text-emerald-400">{syncInfo.uploadedCount}</span></>
            )}
          </div>
          {syncInfo.fetchError && (
            <div className="mt-2 text-red-400">
              <span className="text-gray-500">Fetch error:</span> {syncInfo.fetchError}
            </div>
          )}
          {syncInfo.uploadErrors.length > 0 && (
            <div className="mt-2 text-red-400">
              <span className="text-gray-500">Upload error:</span> {syncInfo.uploadErrors[0]}
            </div>
          )}
        </div>
      )}

      {rides.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-3">🚴</div>
          <h2 className="text-lg font-semibold text-white">No rides yet</h2>
          <p className="text-gray-500 text-sm mt-1">Start a ride from the live screen — it&apos;ll show up here when you finish.</p>
          <Link href="/ride" className="btn-primary mt-5 text-sm px-4 py-2">Go to Live Ride</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rides.map((ride) => (
            <button
              key={ride.id}
              onClick={() => openRide(ride)}
              className="card text-left hover:border-sky-500/40 transition-colors"
            >
              <div className="text-xs text-gray-500">
                {new Date(ride.startedAt).toLocaleString()}
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <div className="text-3xl font-bold text-white tabular-nums">
                  {ride.totalDistMi.toFixed(2)}
                  <span className="ml-1 text-sm text-gray-500 font-normal">mi</span>
                </div>
                <div className="text-sm text-gray-400 tabular-nums">{fmtDuration(ride.movingTimeSec)}</div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-gray-500">avg</div>
                  <div className="font-semibold text-white">{ride.avgSpeedMph.toFixed(1)} mph</div>
                </div>
                <div>
                  <div className="text-gray-500">↑</div>
                  <div className="font-semibold text-emerald-400">{Math.round(ride.ascentFt)} ft</div>
                </div>
                <div>
                  <div className="text-gray-500">↓</div>
                  <div className="font-semibold text-amber-400">{Math.round(ride.descentFt)} ft</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-3 sm:p-6"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-800 bg-gray-950 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {new Date(selected.startedAt).toLocaleString()}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selected.points.length} GPS points · {selected.laps.length} mile splits
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-300">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Distance" value={`${selected.totalDistMi.toFixed(2)} mi`} />
              <Stat label="Moving Time" value={fmtDuration(selected.movingTimeSec)} />
              <Stat label="Avg Speed" value={`${selected.avgSpeedMph.toFixed(1)} mph`} />
              <Stat label="Max Speed" value={`${selected.maxSpeedMph.toFixed(1)} mph`} />
              <Stat label="Ascent" value={`${Math.round(selected.ascentFt)} ft`} color="emerald" />
              <Stat label="Descent" value={`${Math.round(selected.descentFt)} ft`} color="amber" />
              <Stat label="Total Time" value={fmtDuration(selected.totalTimeSec)} />
              <Stat label="Stops" value={fmtDuration(selected.totalTimeSec - selected.movingTimeSec)} />
            </div>

            {selected.points.length >= 2 && (
              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] uppercase tracking-widest text-gray-500">Route</div>
                  {selected.stops && selected.stops.length > 0 && (
                    <div className="text-[10px] uppercase tracking-widest text-gray-500">
                      {selected.stops.length} stop{selected.stops.length === 1 ? "" : "s"}
                    </div>
                  )}
                </div>
                <RideRouteMap points={selected.points} stops={selected.stops} />
                {selected.stops && selected.stops.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {selected.stops.map((s) => {
                      const emoji = s.type === "food" ? "🍔" : s.type === "bathroom" ? "🚻" : "📍";
                      const label = s.type === "food" ? "Food" : s.type === "bathroom" ? "Bathroom" : "Stop";
                      const when = new Date(s.t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
                      return (
                        <li key={s.id} className="flex items-center gap-2 text-xs text-gray-300">
                          <span className="text-base leading-none">{emoji}</span>
                          <span className="font-medium text-white">{label}</span>
                          <span className="text-gray-500">· {when}</span>
                          {s.note && <span className="text-gray-500">· {s.note}</span>}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={() => downloadGpx(selected)}
                className="btn-primary text-sm px-4 py-2"
              >
                ⬇ Download GPX
              </button>
              <button
                onClick={() => handleDelete(selected.id)}
                className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm px-4 py-2 transition-colors"
              >
                Delete
              </button>
            </div>

            <div className="mt-6 border-t border-gray-800 pt-5">
              <RidePhotos rideId={selected.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: "emerald" | "amber" }) {
  const valueClass =
    color === "emerald" ? "text-emerald-400"
    : color === "amber" ? "text-amber-400"
    : "text-white";
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-widest text-gray-500">{label}</div>
      <div className={`text-lg font-bold tabular-nums mt-0.5 ${valueClass}`}>{value}</div>
    </div>
  );
}
