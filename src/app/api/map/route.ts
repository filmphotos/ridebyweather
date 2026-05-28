import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { fetchOsmBathrooms } from "@/lib/osmBathrooms";
import { fetchOsmRestaurants } from "@/lib/osmRestaurants";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 20;

// Returns a Mapbox static-map PNG centered on the device, with restroom +
// restaurant pins. The device can't render the live map, but it can download
// and display this image (Connect IQ makeImageRequest).
//
// Auth via ?token= query param, because image requests can't send an
// Authorization header. Whitelisted in middleware; validated here.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const token = sp.get("token");
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lat = parseFloat(sp.get("lat") ?? "");
  const lng = parseFloat(sp.get("lng") ?? "");
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "valid lat and lng required" }, { status: 400 });
  }

  const type = sp.get("type") ?? "both";
  const zoom = Math.min(16, Math.max(10, parseInt(sp.get("zoom") ?? "14", 10) || 14));
  const w = Math.min(640, Math.max(120, parseInt(sp.get("w") ?? "240", 10) || 240));
  const h = Math.min(640, Math.max(120, parseInt(sp.get("h") ?? "240", 10) || 240));

  const mbToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!mbToken) return NextResponse.json({ error: "Map not configured" }, { status: 500 });

  const pins: string[] = [];
  const radiusMi = 2;
  try {
    if (type === "restrooms" || type === "both") {
      const r = await fetchOsmBathrooms(lat, lng, radiusMi);
      for (const p of r.slice(0, 12)) {
        pins.push(`pin-s-toilet+2563eb(${p.lng.toFixed(5)},${p.lat.toFixed(5)})`);
      }
    }
    if (type === "food" || type === "both") {
      const f = await fetchOsmRestaurants(lat, lng, radiusMi);
      for (const p of f.slice(0, 12)) {
        pins.push(`pin-s-restaurant+f97316(${p.lng.toFixed(5)},${p.lat.toFixed(5)})`);
      }
    }
  } catch (err) {
    console.error("map POI fetch error:", err);
  }
  // Your location, larger red pin.
  pins.push(`pin-l+ef4444(${lng.toFixed(5)},${lat.toFixed(5)})`);

  const overlay = pins.join(",");
  const url =
    `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/` +
    `${overlay}/${lng.toFixed(5)},${lat.toFixed(5)},${zoom}/${w}x${h}` +
    `?access_token=${mbToken}`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error("mapbox static error:", resp.status, await resp.text().catch(() => ""));
      return NextResponse.json({ error: "Map render failed" }, { status: 502 });
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("mapbox fetch error:", err);
    return NextResponse.json({ error: "Map fetch failed" }, { status: 502 });
  }
}
