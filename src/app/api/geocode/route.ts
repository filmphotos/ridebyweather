import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyToken } from "@/lib/auth";

const QuerySchema = z.object({ q: z.string().min(2).max(100) });

export interface GeoResult {
  name: string;
  display: string;
  lat: number;
  lng: number;
  country: string;
}

// Uses Open-Meteo geocoding API — free, no key required
export async function GET(req: NextRequest) {
  const token = req.cookies.get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = QuerySchema.safeParse(params);
  if (!parsed.success) return NextResponse.json({ results: [] });

  const q = parsed.data.q.trim();

  // Open-Meteo's geocoder doesn't index US ZIPs reliably. Route 5-digit input
  // through Zippopotam.us (free, no key, no auth) so ZIP lookups actually work.
  if (/^\d{5}$/.test(q)) {
    try {
      const res = await fetch(`https://api.zippopotam.us/us/${q}`, {
        next: { revalidate: 86400 },
      });
      if (res.ok) {
        const data = (await res.json()) as ZippopotamResult;
        const place = data.places?.[0];
        if (place) {
          const city = place["place name"];
          const state = place["state abbreviation"];
          const result: GeoResult = {
            name: city,
            display: `${city}, ${state} ${data["post code"]}`,
            lat: parseFloat(place.latitude),
            lng: parseFloat(place.longitude),
            country: "US",
          };
          return NextResponse.json({ results: [result] });
        }
      }
    } catch {
      // fall through to Open-Meteo
    }
  }

  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return NextResponse.json({ results: [] });

    const data = await res.json();
    const results: GeoResult[] = (data.results ?? []).map((r: OpenMeteoResult) => ({
      name: r.name,
      display: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
      lat: r.latitude,
      lng: r.longitude,
      country: r.country_code ?? "",
    }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
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

interface OpenMeteoResult {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  country_code?: string;
  admin1?: string;
}
