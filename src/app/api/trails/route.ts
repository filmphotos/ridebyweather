import { NextRequest, NextResponse } from "next/server";
import { fetchOsmTrails } from "@/lib/osmTrails";
import { getAuthPayload } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

const MAX_RADIUS_MI = 50;
const DEFAULT_RADIUS_MI = 20;
const MAX_RESULTS = 40;

export async function GET(req: NextRequest) {
  const payload = await getAuthPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const latRaw = searchParams.get("lat");
  const lngRaw = searchParams.get("lng");
  const radiusRaw = searchParams.get("radius");

  const lat = latRaw ? Number(latRaw) : NaN;
  const lng = lngRaw ? Number(lngRaw) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "lat/lng out of range" }, { status: 400 });
  }

  let radius = radiusRaw ? Number(radiusRaw) : DEFAULT_RADIUS_MI;
  if (!Number.isFinite(radius) || radius <= 0) radius = DEFAULT_RADIUS_MI;
  if (radius > MAX_RADIUS_MI) radius = MAX_RADIUS_MI;

  try {
    const trails = await fetchOsmTrails(lat, lng, radius);
    return NextResponse.json({
      trails: trails.slice(0, MAX_RESULTS),
      truncated: trails.length > MAX_RESULTS,
      total: trails.length,
      radiusMi: radius,
    });
  } catch (err) {
    console.error("[/api/trails] failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Trail lookup failed" }, { status: 502 });
  }
}
