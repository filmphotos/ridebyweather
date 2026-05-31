// Shoe stores from OpenStreetMap. We tag them as `running_store` so they
// drop into the same UI lane the running/walking pages already render — the
// vast majority of `shop=shoes` entries are athletic-friendly, and OSM keeps
// running specialty stores under the same tag.

const OVERPASS_URL = "https://overpass.kumi.systems/api/interpreter";

export interface OsmShoeStore {
  id: string;
  name: string;
  type: "running_store";
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

export async function fetchOsmShoeStores(
  lat: number,
  lng: number,
  radiusMi: number
): Promise<OsmShoeStore[]> {
  const radiusM = Math.round(radiusMi * 1609.34);
  // Round to 0.05° grid (~3.5 mi) so nearby queries share cache entries.
  const gridLat = Math.round(lat * 20) / 20;
  const gridLng = Math.round(lng * 20) / 20;
  const around = `around:${radiusM},${gridLat},${gridLng}`;
  // shop=shoes covers most shoe specialty stores; sport=running picks up
  // running-store entries occasionally tagged shop=sports instead.
  const query =
    `[out:json][timeout:30];` +
    `(` +
      `node["shop"="shoes"](${around});` +
      `way["shop"="shoes"](${around});` +
      `node["shop"="sports"]["sport"~"running",i](${around});` +
      `way["shop"="sports"]["sport"~"running",i](${around});` +
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
    const stores: OsmShoeStore[] = [];
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
      stores.push({
        id: `osm-shoe-${e.type}-${e.id}`,
        name: tags.name,
        type: "running_store",
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
    return stores;
  } catch {
    return [];
  }
}
