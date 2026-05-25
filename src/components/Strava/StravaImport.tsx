"use client";

import { useState, useEffect } from "react";

interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport: "cycling" | "running";
  distanceMi: number;
  elevationFt: number;
  startDate: string;
  hasGps: boolean;
}

interface Props {
  onImported: () => void;
  onClose: () => void;
}

export default function StravaImport({ onImported, onClose }: Props) {
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/strava/activities")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setActivities(data.activities ?? []);
      })
      .catch(() => setError("Failed to load activities"))
      .finally(() => setLoading(false));
  }, []);

  async function handleImport(activity: StravaActivity) {
    setImporting(activity.id);
    setError(null);
    try {
      const res = await fetch("/api/strava/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId: activity.id,
          name: activity.name,
          sport: activity.sport,
          distanceMi: activity.distanceMi,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(null);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function sportIcon(type: string) {
    const runners = ["Run", "TrailRun", "VirtualRun"];
    return runners.includes(type) ? "🏃" : "🚴";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-orange-500" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066l-2.084 4.116z" />
              <path d="M11.094 13.828l2.089 4.116 2.08-4.116H20.6L15.387 3 10.18 13.828h.914z" />
            </svg>
            <h2 className="text-base font-semibold text-white">Import from Strava</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto max-h-96">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && !loading && (
            <div className="px-6 py-8 text-center">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && activities.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">
              No recent activities found.
            </div>
          )}

          {!loading && activities.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between px-6 py-3.5 border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base">{sportIcon(a.type)}</span>
                  <span className="text-sm font-medium text-white truncate">{a.name}</span>
                  {!a.hasGps && (
                    <span className="text-xs text-yellow-500/80 bg-yellow-500/10 px-1.5 py-0.5 rounded">no GPS</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                  <span>{a.distanceMi} mi</span>
                  {a.elevationFt > 0 && <span>+{a.elevationFt} ft</span>}
                  <span>{formatDate(a.startDate)}</span>
                </div>
              </div>
              <button
                onClick={() => handleImport(a)}
                disabled={!!importing || !a.hasGps}
                className="ml-4 flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
              >
                {importing === a.id ? (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" strokeWidth="4" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8" strokeWidth="4" className="opacity-75" />
                    </svg>
                    Importing
                  </span>
                ) : "Import"}
              </button>
            </div>
          ))}
        </div>

        <div className="px-6 py-3 border-t border-gray-800 text-xs text-gray-600 text-center">
          Recent activities with GPS data can be imported as routes.
        </div>
      </div>
    </div>
  );
}
