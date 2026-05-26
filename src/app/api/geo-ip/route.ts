import { NextRequest, NextResponse } from "next/server";

export interface GeoIpResult {
  lat: number;
  lng: number;
  name: string;
  source: "vercel" | "ipapi" | "fallback";
}

export async function GET(req: NextRequest) {
  // Vercel edge headers (production)
  const vLat = req.headers.get("x-vercel-ip-latitude");
  const vLng = req.headers.get("x-vercel-ip-longitude");
  const vCity = req.headers.get("x-vercel-ip-city");
  const vRegion = req.headers.get("x-vercel-ip-country-region");

  if (vLat && vLng) {
    const city = vCity ? decodeURIComponent(vCity) : "";
    const region = vRegion ? decodeURIComponent(vRegion) : "";
    const name = [city, region].filter(Boolean).join(", ") || "Your location";
    return NextResponse.json({
      lat: parseFloat(vLat),
      lng: parseFloat(vLng),
      name,
      source: "vercel",
    } satisfies GeoIpResult);
  }

  // Dev / non-Vercel fallback: server-side IP geolocation
  // Try multiple free providers in order. UA header helps with services that block bot-like requests.
  const providers: { url: string; parse: (d: Record<string, unknown>) => { lat: number; lng: number; city?: string; region?: string } | null }[] = [
    {
      url: "https://get.geojs.io/v1/ip/geo.json",
      parse: (d) => {
        const lat = parseFloat(d.latitude as string);
        const lng = parseFloat(d.longitude as string);
        if (!isFinite(lat) || !isFinite(lng)) return null;
        return { lat, lng, city: d.city as string, region: d.region as string };
      },
    },
    {
      url: "https://freeipapi.com/api/json",
      parse: (d) => {
        const lat = d.latitude as number | undefined;
        const lng = d.longitude as number | undefined;
        if (typeof lat !== "number" || typeof lng !== "number") return null;
        return { lat, lng, city: d.cityName as string, region: d.regionName as string };
      },
    },
    {
      url: "https://ipwho.is/",
      parse: (d) => {
        if (d.success === false) return null;
        const lat = d.latitude as number | undefined;
        const lng = d.longitude as number | undefined;
        if (typeof lat !== "number" || typeof lng !== "number") return null;
        return { lat, lng, city: d.city as string, region: d.region as string };
      },
    },
  ];

  for (const p of providers) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(p.url, {
        cache: "no-store",
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (RideByWeather geo-ip)" },
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = await res.json();
      const parsed = p.parse(data);
      if (!parsed) continue;
      const name = [parsed.city, parsed.region].filter(Boolean).join(", ") || "Your location";
      return NextResponse.json({
        lat: parsed.lat,
        lng: parsed.lng,
        name,
        source: "ipapi",
      } satisfies GeoIpResult);
    } catch {
      // try next provider
    }
  }

  return NextResponse.json({
    lat: 40.7128,
    lng: -74.006,
    name: "New York, NY",
    source: "fallback",
  } satisfies GeoIpResult);
}
