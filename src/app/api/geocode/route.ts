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

  // Optional proximity hint from the caller's last-known location. Mapbox
  // honors it as a soft bias so addresses near the user surface above
  // identically-named streets in other states.
  const nearLat = parseFloat(req.nextUrl.searchParams.get("lat") ?? "");
  const nearLng = parseFloat(req.nextUrl.searchParams.get("lng") ?? "");
  const near = !isNaN(nearLat) && !isNaN(nearLng) ? { lat: nearLat, lng: nearLng } : undefined;

  // A bare 5-digit ZIP: Open-Meteo doesn't index US ZIPs reliably, so resolve
  // it directly via Zippopotam.us (free, no key, no auth).
  if (/^\d{5}$/.test(q)) {
    const zip = await lookupZip(q);
    if (zip) {
      return NextResponse.json({
        results: [
          {
            name: zip.city,
            display: `${zip.city}, ${zip.state} ${zip.postCode}`,
            lat: zip.lat,
            lng: zip.lng,
            country: "US",
          },
        ],
      });
    }
  }

  // An address that ends in a ZIP, e.g. "329 main street 11552". Mapbox's
  // free-text geocoder under-weights a trailing ZIP and scatters results across
  // unrelated towns, so resolve the ZIP to its city/state + centroid and use
  // them to bias the search toward the right area.
  let proximity: { lat: number; lng: number } | undefined;
  let mapboxQuery = q;
  const trailingZip = q.match(/\b(\d{5})(?:-\d{4})?\s*$/);
  if (trailingZip && !/^\d{5}$/.test(q)) {
    const zip = await lookupZip(trailingZip[1]);
    if (zip) {
      proximity = { lat: zip.lat, lng: zip.lng };
      const street = q.slice(0, q.length - trailingZip[0].length).replace(/,\s*$/, "").trim();
      mapboxQuery = `${street} ${zip.city} ${zip.state}`.trim();
    }
  }

  // Open-Meteo only indexes place names (cities/towns), so street addresses
  // return nothing. Mapbox forward geocoding handles addresses, POIs, cities
  // and ZIPs — use it first when a token is configured. ZIP-anchored proximity
  // wins over the caller-supplied hint because it's more precise to the query.
  const mapboxResults = await geocodeMapbox(mapboxQuery, proximity ?? near);
  if (mapboxResults && mapboxResults.length > 0) {
    return NextResponse.json({ results: mapboxResults });
  }

  // Mapbox returned nothing (or no token configured). Try OSM Nominatim —
  // free, no key, handles full street addresses. We only hit it when the
  // query looks address-y (contains a number or a comma) so we don't
  // hammer their servers for plain city names that Open-Meteo handles.
  const looksAddress = /\d/.test(q) || q.includes(",");
  if (looksAddress) {
    const nominatim = await geocodeNominatim(q);
    if (nominatim.length > 0) {
      return NextResponse.json({ results: nominatim });
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

// Resolve a US ZIP to its city/state and centroid via Zippopotam.us.
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

// Forward-geocode with Mapbox. Returns null when no token is set or the request
// fails, so callers can fall back to Open-Meteo. An optional proximity point
// biases results toward a location (used for ZIP-anchored address lookups).
async function geocodeMapbox(
  q: string,
  proximity?: { lat: number; lng: number }
): Promise<GeoResult[] | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  let url =
    `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(q)}` +
    `&limit=6&autocomplete=true&language=en&country=us&access_token=${encodeURIComponent(token)}`;
  if (proximity) url += `&proximity=${proximity.lng},${proximity.lat}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      console.error("Mapbox geocode error:", res.status);
      return null;
    }
    const data = (await res.json()) as MapboxGeoResponse;
    return (data.features ?? [])
      .filter((f) => f.geometry?.coordinates?.length === 2 && f.properties?.name)
      .map((f): GeoResult => {
        const p = f.properties!;
        const [lng, lat] = f.geometry!.coordinates;
        return {
          name: p.name!,
          display: p.full_address ?? p.place_formatted ?? p.name!,
          lat,
          lng,
          country: p.context?.country?.country_code?.toUpperCase() ?? "",
        };
      });
  } catch (err) {
    console.error("Mapbox geocode fetch failed:", err);
    return null;
  }
}

// Free OSM Nominatim address geocoder. No token required. Their usage policy
// (https://operations.osmfoundation.org/policies/nominatim/) requires a
// descriptive User-Agent and a request rate well under 1/sec — we cache the
// result for an hour to stay polite even under typical traffic.
async function geocodeNominatim(q: string): Promise<GeoResult[]> {
  const url =
    `https://nominatim.openstreetmap.org/search?` +
    `q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=6&countrycodes=us`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "RideByWeather/1.0 (https://ridebyweather.com)" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      console.error("Nominatim error:", res.status);
      return [];
    }
    const data = (await res.json()) as NominatimResult[];
    return data
      .filter((r) => r.lat && r.lon && r.display_name)
      .map((r): GeoResult => {
        const a = r.address ?? {};
        const name =
          a.road
            ? [a.house_number, a.road].filter(Boolean).join(" ")
            : a.city ?? a.town ?? a.village ?? r.display_name.split(",")[0];
        return {
          name,
          display: r.display_name,
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
          country: (a.country_code ?? "us").toUpperCase(),
        };
      });
  } catch (err) {
    console.error("Nominatim fetch failed:", err);
    return [];
  }
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    country_code?: string;
  };
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

interface OpenMeteoResult {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  country_code?: string;
  admin1?: string;
}

interface MapboxGeoResponse {
  features?: Array<{
    geometry?: { type: "Point"; coordinates: [number, number] };
    properties?: {
      name?: string;
      full_address?: string;
      place_formatted?: string;
      context?: { country?: { country_code?: string } };
    };
  }>;
}
