"use client";

import { useEffect, useMemo, useState } from "react";
import type { ElevationResponse, ElevationSample } from "@/app/api/elevation/route";

interface Props {
  /** Waypoints to fetch DEM elevation for. Required unless `data` is passed. */
  waypoints?: [number, number][];
  /**
   * Pre-computed elevation data. When provided, the chart renders directly
   * without hitting `/api/elevation`. Used by the live-ride view where we
   * already have GPS altitudes for each point.
   */
  data?: ElevationResponse;
}

// Color by gradient severity, matching the wind-stat palette.
function gradeColor(pct: number): string {
  const a = Math.abs(pct);
  if (a < 2) return "#22c55e";   // flat-ish — green
  if (a < 5) return "#eab308";   // moderate — yellow
  if (a < 9) return "#f97316";   // hard — orange
  return "#ef4444";              // very hard — red
}

const CHART_W = 600;
const CHART_H = 140;
const PAD_L = 32;
const PAD_R = 8;
const PAD_T = 8;
const PAD_B = 22;

export default function ElevationProfile({ waypoints, data: providedData }: Props) {
  const [fetchedData, setFetchedData] = useState<ElevationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Stable key so we refetch only when geometry actually changes.
  const wpKey = useMemo(
    () =>
      waypoints
        ? waypoints.map(([lng, lat]) => `${lng.toFixed(5)},${lat.toFixed(5)}`).join("|")
        : "",
    [waypoints]
  );

  useEffect(() => {
    // If the parent supplies data directly, skip the fetch entirely.
    if (providedData) return;
    if (!waypoints || waypoints.length < 2) {
      setFetchedData(null);
      setError(null);
      return;
    }

    const ctrl = new AbortController();
    const debounce = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/elevation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ waypoints }),
          signal: ctrl.signal,
        });
        if (!res.ok) {
          if (res.status === 401) throw new Error("Sign in to view elevation");
          throw new Error("Couldn't load elevation");
        }
        setFetchedData((await res.json()) as ElevationResponse);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }, 450);

    return () => {
      ctrl.abort();
      clearTimeout(debounce);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wpKey, providedData]);

  const data = providedData ?? fetchedData;

  const chart = useMemo(() => {
    if (!data || data.samples.length < 2) return null;
    const samples = data.samples;
    const minE = Math.min(...samples.map((s) => s.elevFt));
    const maxE = Math.max(...samples.map((s) => s.elevFt));
    const range = Math.max(maxE - minE, 10);
    const totalD = samples[samples.length - 1].distMi || 1;

    const x = (s: ElevationSample) =>
      PAD_L + ((s.distMi / totalD) * (CHART_W - PAD_L - PAD_R));
    const y = (s: ElevationSample) =>
      PAD_T + (CHART_H - PAD_T - PAD_B) * (1 - (s.elevFt - minE) / range);

    // Build a filled polygon per segment, colored by that segment's gradient.
    const bars = samples.slice(1).map((s, i) => {
      const prev = samples[i];
      const x0 = x(prev);
      const x1 = x(s);
      const y0 = y(prev);
      const y1 = y(s);
      const yBase = CHART_H - PAD_B;
      const color = gradeColor(s.gradientPct);
      return { key: i, d: `M${x0},${yBase} L${x0},${y0} L${x1},${y1} L${x1},${yBase} Z`, color };
    });

    const linePath = samples
      .map((s, i) => `${i === 0 ? "M" : "L"}${x(s).toFixed(2)},${y(s).toFixed(2)}`)
      .join(" ");

    // Y-axis ticks (3 evenly spaced)
    const yTicks = [0, 0.5, 1].map((t) => {
      const ft = minE + range * (1 - t);
      return { y: PAD_T + (CHART_H - PAD_T - PAD_B) * t, label: `${Math.round(ft)}` };
    });

    return { bars, linePath, x, y, minE, maxE, totalD, yTicks };
  }, [data]);

  // Hide the card entirely when there's nothing to render in either mode.
  if (!providedData && (!waypoints || waypoints.length < 2)) return null;
  if (providedData && providedData.samples.length < 2) return null;

  return (
    <div className="mt-4 rounded-xl border border-gray-800 bg-gray-900/60 p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Elevation Profile
        </h4>
        {data && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-400">
            <span>
              <span className="text-green-400">↑ {Math.round(data.ascentFt)} ft</span>
            </span>
            <span>
              <span className="text-sky-400">↓ {Math.round(data.descentFt)} ft</span>
            </span>
            <span>
              max <span className="text-orange-400">{data.maxGradePct.toFixed(1)}%</span>
            </span>
            <span>
              min <span className="text-red-400">{data.minGradePct.toFixed(1)}%</span>
            </span>
          </div>
        )}
      </div>

      {loading && !data && (
        <div className="h-[140px] flex items-center justify-center">
          <div className="h-5 w-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && !loading && (
        <p className="h-[140px] flex items-center justify-center text-xs text-gray-500">{error}</p>
      )}

      {chart && (
        <div className="relative">
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            className="w-full h-[140px] select-none"
            onMouseLeave={() => setHoverIdx(null)}
            onMouseMove={(e) => {
              const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
              const px = ((e.clientX - rect.left) / rect.width) * CHART_W;
              const totalD = data!.samples[data!.samples.length - 1].distMi || 1;
              const distAtPx = ((px - PAD_L) / (CHART_W - PAD_L - PAD_R)) * totalD;
              let nearest = 0;
              let best = Infinity;
              data!.samples.forEach((s, i) => {
                const d = Math.abs(s.distMi - distAtPx);
                if (d < best) { best = d; nearest = i; }
              });
              setHoverIdx(nearest);
            }}
          >
            {/* Y grid */}
            {chart.yTicks.map((t, i) => (
              <g key={i}>
                <line
                  x1={PAD_L}
                  x2={CHART_W - PAD_R}
                  y1={t.y}
                  y2={t.y}
                  stroke="#1f2937"
                  strokeDasharray="2 3"
                />
                <text x={PAD_L - 4} y={t.y + 3} fill="#6b7280" fontSize="9" textAnchor="end">
                  {t.label}
                </text>
              </g>
            ))}

            {/* Gradient-colored fill bars */}
            {chart.bars.map((b) => (
              <path key={b.key} d={b.d} fill={b.color} fillOpacity={0.35} />
            ))}

            {/* Elevation outline */}
            <path d={chart.linePath} fill="none" stroke="#e5e7eb" strokeWidth={1.5} />

            {/* Hover marker */}
            {hoverIdx !== null && data && (
              <>
                <line
                  x1={chart.x(data.samples[hoverIdx])}
                  x2={chart.x(data.samples[hoverIdx])}
                  y1={PAD_T}
                  y2={CHART_H - PAD_B}
                  stroke="#38bdf8"
                  strokeWidth={1}
                />
                <circle
                  cx={chart.x(data.samples[hoverIdx])}
                  cy={chart.y(data.samples[hoverIdx])}
                  r={3}
                  fill="#38bdf8"
                />
              </>
            )}

            {/* X axis label */}
            <text x={PAD_L} y={CHART_H - 6} fill="#6b7280" fontSize="9">0 mi</text>
            <text
              x={CHART_W - PAD_R}
              y={CHART_H - 6}
              fill="#6b7280"
              fontSize="9"
              textAnchor="end"
            >
              {data!.totalDistMi.toFixed(1)} mi
            </text>
            <text x={4} y={PAD_T + 4} fill="#6b7280" fontSize="9">ft</text>
          </svg>

          {hoverIdx !== null && data && (
            <div className="absolute top-1 right-1 rounded-md bg-gray-900/90 border border-gray-700 px-2 py-1 text-[10px] text-gray-200 leading-tight pointer-events-none">
              <div>{data.samples[hoverIdx].distMi.toFixed(2)} mi</div>
              <div>{Math.round(data.samples[hoverIdx].elevFt)} ft</div>
              <div style={{ color: gradeColor(data.samples[hoverIdx].gradientPct) }}>
                {data.samples[hoverIdx].gradientPct >= 0 ? "+" : ""}
                {data.samples[hoverIdx].gradientPct.toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      )}

      {data && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "#22c55e", opacity: 0.5 }} />
            &lt;2%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "#eab308", opacity: 0.5 }} />
            2–5%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "#f97316", opacity: 0.5 }} />
            5–9%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "#ef4444", opacity: 0.5 }} />
            ≥9%
          </span>
        </div>
      )}
    </div>
  );
}
