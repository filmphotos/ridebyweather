import { NextRequest, NextResponse } from "next/server";
import { fetchOsmMedical } from "@/lib/osmMedical";
import { fetchMapboxMedical } from "@/lib/mapboxSearch";
import { getAuthPayload } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 15;

const MEDICAL_LIMIT = 5;
// OSM Overpass is the slowest source and the one most likely to hang under
// load. We give it 5s in full mode — if it makes it, great; if not, Mapbox
// alone covers the vast majority of US hospitals and urgent cares.
const OSM_TIMEOUT_MS = 5_000;
const MAPBOX_TIMEOUT_MS = 4_000;

function withTimeout<T>(p: Promise<T>, fallback: T, label: string, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutP = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      console.error(`[medical] ${label} timed out after ${ms}ms`);
      resolve(fallback);
    }, ms);
  });
  const wrapped = p.catch((err) => {
    console.error(`[medical] ${label} rejected:`, err);
    return fallback;
  });
  return Promise.race([wrapped, timeoutP]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function haversineMi(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(req: NextRequest) {
  const payload = await getAuthPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const radiusMi = parseFloat(searchParams.get("radius") ?? "15");
  // mode=fast skips OSM entirely so the client can paint Mapbox results in
  // ~1s and then call again with mode=full for richer coverage.
  const mode = searchParams.get("mode") ?? "full";

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  const [osmC, mapboxC] = await Promise.all([
    mode === "fast"
      ? Promise.resolve([])
      : withTimeout(fetchOsmMedical(lat, lng, radiusMi), [], "osmMedical", OSM_TIMEOUT_MS),
    withTimeout(
      fetchMapboxMedical(lat, lng, Math.min(radiusMi, 10)),
      [],
      "mapboxMedical",
      MAPBOX_TIMEOUT_MS
    ),
  ]);

  const seen = new Set<string>();
  const medical = [...osmC, ...mapboxC]
    .filter((m) => {
      const k = m.name.toLowerCase().trim();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((m) => ({ ...m, distanceMi: haversineMi(lat, lng, m.lat, m.lng) }))
    .filter((m) => m.distanceMi <= radiusMi)
    .sort((a, b) => {
      const rank = (t: string) => (t === "urgent_care" ? 0 : t === "hospital" ? 1 : 2);
      return rank(a.type) - rank(b.type) || a.distanceMi - b.distanceMi;
    })
    .slice(0, MEDICAL_LIMIT);

  return NextResponse.json({ medical });
}
