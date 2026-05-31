import { NextRequest, NextResponse } from "next/server";
import { fetchOsmMedical } from "@/lib/osmMedical";
import { fetchMapboxMedical } from "@/lib/mapboxSearch";
import { getAuthPayload } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 15;

const MEDICAL_LIMIT = 5;
// Tight timeouts — Mapbox is usually <800 ms and OSM Overpass <2s on a warm
// cache. If either is slower than this on a given request, the other source
// covers it and we'd rather return what we have than make the user wait.
const OSM_TIMEOUT_MS = 3_000;
const MAPBOX_TIMEOUT_MS = 3_000;

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
  const radiusMi = parseFloat(searchParams.get("radius") ?? "15");
  let lat = parseFloat(searchParams.get("lat") ?? "");
  let lng = parseFloat(searchParams.get("lng") ?? "");
  let resolvedPlace: { display: string } | undefined;

  // Accept `?zip=XXXXX` so the client can do ZIP → results in a single
  // round-trip. Saves a separate /api/geocode call on cellular, which was
  // the biggest source of perceived latency from the phone.
  const zip = searchParams.get("zip");
  if ((isNaN(lat) || isNaN(lng)) && zip && /^\d{5}$/.test(zip.trim())) {
    const z = await lookupZip(zip.trim());
    if (z) {
      lat = z.lat;
      lng = z.lng;
      resolvedPlace = { display: `${z.city}, ${z.state} ${z.postCode}` };
    }
  }

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng (or zip) required" }, { status: 400 });
  }

  const [osmC, mapboxC] = await Promise.all([
    withTimeout(fetchOsmMedical(lat, lng, radiusMi), [], "osmMedical", OSM_TIMEOUT_MS),
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

  return NextResponse.json({ medical, place: resolvedPlace });
}

async function lookupZip(zip: string): Promise<ZipInfo | null> {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as ZippopotamResult;
    const place = data.places?.[0];
    if (!place) return null;
    return {
      city: place["place name"],
      state: place["state abbreviation"],
      postCode: data["post code"],
      lat: parseFloat(place.latitude),
      lng: parseFloat(place.longitude),
    };
  } catch {
    return null;
  }
}

interface ZipInfo {
  city: string;
  state: string;
  postCode: string;
  lat: number;
  lng: number;
}

interface ZippopotamResult {
  "post code": string;
  country: string;
  places: Array<{
    "place name": string;
    "state abbreviation": string;
    latitude: string;
    longitude: string;
  }>;
}
