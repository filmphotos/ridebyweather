"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { fmtDuration } from "@/lib/ride/rideMath";

const WatchMap = dynamic(() => import("./WatchMap"), { ssr: false });

interface LiveView {
  riderName: string;
  sport: string;
  status: "active" | "ended";
  stale: boolean;
  startedAt: string;
  updatedAt: string;
  endedAt: string | null;
  lat: number | null;
  lng: number | null;
  speedMph: number | null;
  headingDeg: number | null;
  distanceMi: number;
  elapsedSec: number;
  path: number[][];
}

const POLL_MS = 7000;

const SPORT_META: Record<string, { emoji: string; noun: string }> = {
  cycling: { emoji: "🚴", noun: "ride" },
  running: { emoji: "🏃", noun: "run" },
  walking: { emoji: "🚶", noun: "walk" },
};

export default function WatchClient({ token }: { token: string }) {
  const [data, setData] = useState<LiveView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/view/${token}`, { cache: "no-store" });
      if (res.status === 404) {
        setError("This live link wasn't found. It may have expired.");
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error("fetch failed");
      const d = (await res.json()) as LiveView;
      setData(d);
      setError(null);
    } catch {
      setError("Couldn't reach the live ride. Retrying…");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll while the ride is active; stop once it ends.
  useEffect(() => {
    if (data?.status === "ended") return;
    timerRef.current = setTimeout(load, POLL_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, load]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-4xl mb-3">🔌</div>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const meta = SPORT_META[data.sport] ?? SPORT_META.cycling;
  const current = data.lat != null && data.lng != null ? { lat: data.lat, lng: data.lng } : null;
  const ended = data.status === "ended";
  const updatedSecAgo = Math.max(0, Math.round((Date.now() - new Date(data.updatedAt).getTime()) / 1000));

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-gray-500">Live {meta.noun}</div>
            <h1 className="text-xl font-bold">
              {meta.emoji} {data.riderName}
            </h1>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              ended
                ? "bg-gray-700 text-gray-300"
                : data.stale
                ? "bg-amber-500/20 text-amber-400"
                : "bg-emerald-500/20 text-emerald-400"
            }`}
          >
            {ended ? "Finished" : data.stale ? "Signal lost" : "● Live"}
          </span>
        </div>

        <div className="card overflow-hidden p-0 h-[55vh] min-h-[360px]">
          <WatchMap path={data.path} current={current} headingDeg={data.headingDeg} />
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="card py-4 text-center">
            <div className="text-[10px] uppercase tracking-widest text-gray-500">Distance</div>
            <div className="text-3xl font-bold tabular-nums text-white mt-1">
              {data.distanceMi.toFixed(2)}
              <span className="ml-1 text-sm text-gray-500 font-normal">mi</span>
            </div>
          </div>
          <div className="card py-4 text-center">
            <div className="text-[10px] uppercase tracking-widest text-gray-500">Time</div>
            <div className="text-3xl font-bold tabular-nums text-white mt-1">{fmtDuration(data.elapsedSec)}</div>
          </div>
          <div className="card py-4 text-center">
            <div className="text-[10px] uppercase tracking-widest text-gray-500">Speed</div>
            <div className="text-3xl font-bold tabular-nums text-white mt-1">
              {data.speedMph != null ? data.speedMph.toFixed(1) : "—"}
              <span className="ml-1 text-sm text-gray-500 font-normal">mph</span>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-gray-600">
          {ended ? (
            <>This {meta.noun} has finished.</>
          ) : (
            <>Updated {updatedSecAgo}s ago · refreshes automatically</>
          )}
        </div>
      </div>
    </div>
  );
}
