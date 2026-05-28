import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";
import { fetchOsmBathrooms } from "@/lib/osmBathrooms";
import { fetchOsmRestaurants } from "@/lib/osmRestaurants";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 20;

const LIMIT = 8;

function haversineMi(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Initial bearing (degrees, 0..360) from point 1 to point 2.
function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180) / Math.PI + 360;
}

export async function GET(req: NextRequest) {
  const payload = await getAuthPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const lat = parseFloat(sp.get("lat") ?? "");
  const lng = parseFloat(sp.get("lng") ?? "");
  const type = sp.get("type") === "food" ? "food" : "restrooms";
  const radius = parseFloat(sp.get("radius") ?? "3");

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "valid lat and lng required" }, { status: 400 });
  }

  try {
    const raw: Array<{ name: string; lat: number; lng: number; type?: string }> =
      type === "food"
        ? await fetchOsmRestaurants(lat, lng, radius)
        : await fetchOsmBathrooms(lat, lng, radius);

    const items = raw
      .map((p) => ({
        name: p.name,
        kind: type === "food" ? (p.type ?? "restaurant") : "restroom",
        distanceMi: Math.round(haversineMi(lat, lng, p.lat, p.lng) * 10) / 10,
        bearingDeg: Math.round(bearingDeg(lat, lng, p.lat, p.lng) % 360),
      }))
      .sort((a, b) => a.distanceMi - b.distanceMi)
      .slice(0, LIMIT);

    return NextResponse.json({ type, items });
  } catch (err) {
    console.error("poi error:", err);
    return NextResponse.json({ error: "Failed to load nearby places" }, { status: 500 });
  }
}
