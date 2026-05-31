import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthPayload } from "@/lib/auth";

const BodySchema = z.object({
  waypoints: z
    .array(z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]))
    .min(2)
    .max(50),
});

const SAMPLE_COUNT = 80;
const METERS_TO_FEET = 3.28084;
const METERS_TO_MILES = 0.000621371;

export interface ElevationSample {
  distMi: number;
  elevFt: number;
  gradientPct: number;
}

export interface ElevationResponse {
  samples: ElevationSample[];
  totalDistMi: number;
  ascentFt: number;
  descentFt: number;
  maxGradePct: number;
  minGradePct: number;
}

function haversineM(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Walk the polyline and produce N evenly-spaced [lng,lat] samples.
function densify(waypoints: [number, number][], n: number): { points: [number, number][]; cumDistM: number[] } {
  const segDists = waypoints.slice(0, -1).map((p, i) =>
    haversineM(p[0], p[1], waypoints[i + 1][0], waypoints[i + 1][1])
  );
  const total = segDists.reduce((a, b) => a + b, 0);
  if (total === 0) {
    return { points: [waypoints[0]], cumDistM: [0] };
  }
  const stepM = total / (n - 1);
  const points: [number, number][] = [];
  const cumDistM: number[] = [];

  let segIdx = 0;
  let distIntoSeg = 0;

  for (let i = 0; i < n; i++) {
    const targetDist = i * stepM;
    let acc = 0;
    for (let j = 0; j < segDists.length; j++) {
      if (acc + segDists[j] >= targetDist) {
        segIdx = j;
        distIntoSeg = targetDist - acc;
        break;
      }
      acc += segDists[j];
      segIdx = j + 1;
      distIntoSeg = 0;
    }

    if (segIdx >= waypoints.length - 1) {
      points.push(waypoints[waypoints.length - 1]);
    } else {
      const a = waypoints[segIdx];
      const b = waypoints[segIdx + 1];
      const t = segDists[segIdx] > 0 ? distIntoSeg / segDists[segIdx] : 0;
      points.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
    cumDistM.push(targetDist);
  }

  return { points, cumDistM };
}

export async function POST(req: NextRequest) {
  // Honor both web cookie and Wear OS Bearer token (see auth memory).
  const payload = await getAuthPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { points, cumDistM } = densify(parsed.data.waypoints, SAMPLE_COUNT);

  const lats = points.map((p) => p[1].toFixed(5)).join(",");
  const lngs = points.map((p) => p[0].toFixed(5)).join(",");

  let elevationsM: number[];
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    const data = (await res.json()) as { elevation: number[] };
    elevationsM = data.elevation;
    if (!Array.isArray(elevationsM) || elevationsM.length !== points.length) {
      throw new Error("Bad elevation payload");
    }
  } catch {
    return NextResponse.json({ error: "Elevation service unavailable" }, { status: 502 });
  }

  // Smooth with a 3-point moving average to mute single-pixel DEM noise before computing grade.
  const smoothM = elevationsM.map((e, i) => {
    const prev = elevationsM[i - 1] ?? e;
    const next = elevationsM[i + 1] ?? e;
    return (prev + e + next) / 3;
  });

  const samples: ElevationSample[] = points.map((_, i) => {
    let gradientPct = 0;
    if (i > 0) {
      const run = cumDistM[i] - cumDistM[i - 1];
      if (run > 0) gradientPct = ((smoothM[i] - smoothM[i - 1]) / run) * 100;
    }
    return {
      distMi: cumDistM[i] * METERS_TO_MILES,
      elevFt: smoothM[i] * METERS_TO_FEET,
      gradientPct,
    };
  });

  let ascentFt = 0;
  let descentFt = 0;
  let maxGradePct = 0;
  let minGradePct = 0;
  for (let i = 1; i < smoothM.length; i++) {
    const delta = (smoothM[i] - smoothM[i - 1]) * METERS_TO_FEET;
    if (delta > 0) ascentFt += delta;
    else descentFt += -delta;
    const g = samples[i].gradientPct;
    if (g > maxGradePct) maxGradePct = g;
    if (g < minGradePct) minGradePct = g;
  }

  const response: ElevationResponse = {
    samples,
    totalDistMi: cumDistM[cumDistM.length - 1] * METERS_TO_MILES,
    ascentFt,
    descentFt,
    maxGradePct,
    minGradePct,
  };

  return NextResponse.json(response);
}
