"use client";

import { useMemo } from "react";
import ElevationProfile from "./ElevationProfile";
import type { ElevationResponse } from "@/app/api/elevation/route";
import { haversineM, M_TO_FT, M_TO_MI, type TrackPoint } from "@/lib/ride/rideMath";

interface Props {
  points: TrackPoint[];
}

// Roughly how many bars to draw. Independent of GPS-fix count so a 5-mile ride
// and a 50-mile ride look comparable.
const TARGET_SAMPLES = 60;

/**
 * Renders the elevation/gradient chart for an in-progress live ride, deriving
 * the data directly from GPS altitude samples on each TrackPoint. This avoids
 * a round-trip to the elevation API (the device already knows its altitude)
 * and works offline.
 */
export default function LiveElevationProfile({ points }: Props) {
  const data = useMemo<ElevationResponse | null>(() => {
    const withAlt = points.filter((p) => p.altM != null) as Array<
      TrackPoint & { altM: number }
    >;
    if (withAlt.length < 2) return null;

    // Cumulative distance along the actual GPS track
    const cumDistM: number[] = [0];
    for (let i = 1; i < withAlt.length; i++) {
      const prev = withAlt[i - 1];
      const cur = withAlt[i];
      cumDistM.push(
        cumDistM[i - 1] + haversineM(prev.lat, prev.lng, cur.lat, cur.lng)
      );
    }
    const totalM = cumDistM[cumDistM.length - 1];
    if (totalM < 1) return null;

    // Pick ~TARGET_SAMPLES evenly spaced by distance (not by index — slow
    // sections shouldn't dominate the chart).
    const step = totalM / (TARGET_SAMPLES - 1);
    const sampledIdx: number[] = [0];
    let next = step;
    for (let i = 1; i < withAlt.length && sampledIdx.length < TARGET_SAMPLES; i++) {
      if (cumDistM[i] >= next) {
        sampledIdx.push(i);
        next += step;
      }
    }
    if (sampledIdx[sampledIdx.length - 1] !== withAlt.length - 1) {
      sampledIdx.push(withAlt.length - 1);
    }

    // 3-point moving average to mute the GPS altitude jitter we'd otherwise
    // show as fake +30%/-30% gradient spikes.
    const elev = sampledIdx.map((i) => withAlt[i].altM);
    const smooth = elev.map((e, i) => {
      const prev = elev[i - 1] ?? e;
      const nxt = elev[i + 1] ?? e;
      return (prev + e + nxt) / 3;
    });

    const samples = sampledIdx.map((idx, i) => {
      let gradientPct = 0;
      if (i > 0) {
        const run = cumDistM[idx] - cumDistM[sampledIdx[i - 1]];
        if (run > 0) gradientPct = ((smooth[i] - smooth[i - 1]) / run) * 100;
      }
      return {
        distMi: cumDistM[idx] * M_TO_MI,
        elevFt: smooth[i] * M_TO_FT,
        gradientPct,
      };
    });

    let ascentFt = 0;
    let descentFt = 0;
    let maxGradePct = 0;
    let minGradePct = 0;
    for (let i = 1; i < smooth.length; i++) {
      const dFt = (smooth[i] - smooth[i - 1]) * M_TO_FT;
      if (dFt > 0) ascentFt += dFt;
      else descentFt += -dFt;
      const g = samples[i].gradientPct;
      if (g > maxGradePct) maxGradePct = g;
      if (g < minGradePct) minGradePct = g;
    }

    return {
      samples,
      totalDistMi: totalM * M_TO_MI,
      ascentFt,
      descentFt,
      maxGradePct,
      minGradePct,
    };
  }, [points]);

  if (!data) return null;
  return <ElevationProfile data={data} />;
}
