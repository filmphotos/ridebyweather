const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

export type MedicalType = "hospital" | "urgent_care" | "clinic";

export interface OsmMedical {
  id: string;
  name: string;
  type: MedicalType;
  lat: number;
  lng: number;
  address: string | null;
  phone: string | null;
  website: string | null;
  description: null;
  isVerified: false;
  tier: "free";
  source: "osm";
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

function classify(tags: Record<string, string>): MedicalType | null {
  if (tags.amenity === "hospital") return "hospital";
  if (tags.healthcare === "hospital") return "hospital";
  if (tags.healthcare === "urgent_care") return "urgent_care";
  if (tags.amenity === "clinic" || tags.healthcare === "clinic") return "clinic";
  return null;
}

export async function fetchOsmMedical(
  lat: number,
  lng: number,
  radiusMi: number
): Promise<OsmMedical[]> {
  const radiusM = Math.round(radiusMi * 1609.34);
  // Round to 0.05° grid (~3.5 mi) so nearby queries share cache entries
  const gridLat = Math.round(lat * 20) / 20;
  const gridLng = Math.round(lng * 20) / 20;
  const around = `around:${radiusM},${gridLat},${gridLng}`;
  const query =
    `[out:json][timeout:7];` +
    `(` +
      `node["amenity"="hospital"](${around});` +
      `way["amenity"="hospital"](${around});` +
      `node["healthcare"="hospital"](${around});` +
      `way["healthcare"="hospital"](${around});` +
      `node["healthcare"="urgent_care"](${around});` +
      `way["healthcare"="urgent_care"](${around});` +
      `node["amenity"="clinic"](${around});` +
      `way["amenity"="clinic"](${around});` +
      `node["healthcare"="clinic"](${around});` +
      `way["healthcare"="clinic"](${around});` +
    `);` +
    `out center tags;`;

  // Hard fetch-level timeout so a hung Overpass query can't take down the
  // whole /api/partners call (Vercel Hobby caps functions at ~10s).
  const ctrl = new AbortController();
  const killer = setTimeout(() => ctrl.abort(), 8000);

  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "RideByWeather/1.0 (https://ridebyweather.com)",
      },
      body: "data=" + encodeURIComponent(query),
      signal: ctrl.signal,
      next: { revalidate: 86400 },
    });
    clearTimeout(killer);
    if (!res.ok) {
      console.error("OSM medical Overpass error:", res.status);
      return [];
    }

    const data = (await res.json()) as OverpassResponse;
    const seen = new Set<string>();
    const out: OsmMedical[] = [];
    for (const e of data.elements ?? []) {
      const tags = e.tags ?? {};
      if (!tags.name) continue;
      const type = classify(tags);
      if (!type) continue;
      const elLat = e.lat ?? e.center?.lat;
      const elLng = e.lon ?? e.center?.lon;
      if (elLat === undefined || elLng === undefined) continue;

      const key = tags.name.toLowerCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);

      const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
      const cityState = [tags["addr:city"], tags["addr:state"]].filter(Boolean).join(", ");
      const address = [street, cityState].filter(Boolean).join(", ") || null;
      out.push({
        id: `osm-${e.type}-${e.id}`,
        name: tags.name,
        type,
        lat: elLat,
        lng: elLng,
        address,
        phone: tags.phone ?? null,
        website: tags.website ?? null,
        description: null,
        isVerified: false,
        tier: "free",
        source: "osm",
      });
    }
    return out;
  } catch (err) {
    clearTimeout(killer);
    console.error("OSM medical fetch failed:", err);
    return [];
  }
}
