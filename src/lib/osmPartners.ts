// kumi.systems mirror — overpass-api.de routinely 504s on these queries.
const OVERPASS_URL = "https://overpass.kumi.systems/api/interpreter";

export interface OsmPartner {
  id: string;
  name: string;
  type: "bike_shop";
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

export async function fetchOsmBikeShops(
  lat: number,
  lng: number,
  radiusMi: number
): Promise<OsmPartner[]> {
  const radiusM = Math.round(radiusMi * 1609.34);
  // Round to 0.05° grid (~3.5 mi) so nearby queries share cache entries
  const gridLat = Math.round(lat * 20) / 20;
  const gridLng = Math.round(lng * 20) / 20;
  const around = `around:${radiusM},${gridLat},${gridLng}`;
  const query =
    `[out:json][timeout:30];` +
    `(` +
      `node["shop"="bicycle"](${around});` +
      `way["shop"="bicycle"](${around});` +
    `);` +
    `out center tags;`;

  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "RideByWeather/1.0 (https://ridebyweather.com)",
      },
      body: "data=" + encodeURIComponent(query),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as OverpassResponse;
    const seen = new Set<string>();
    const partners: OsmPartner[] = [];
    for (const e of data.elements ?? []) {
      const tags = e.tags ?? {};
      if (!tags.name) continue;
      const elLat = e.lat ?? e.center?.lat;
      const elLng = e.lon ?? e.center?.lon;
      if (elLat === undefined || elLng === undefined) continue;

      const key = tags.name.toLowerCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);

      const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
      const cityState = [tags["addr:city"], tags["addr:state"]].filter(Boolean).join(", ");
      const address = [street, cityState].filter(Boolean).join(", ") || null;
      partners.push({
        id: `osm-${e.type}-${e.id}`,
        name: tags.name,
        type: "bike_shop",
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
    return partners;
  } catch {
    return [];
  }
}
