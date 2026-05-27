import { racedOverpass, gridSnap } from "./overpass";

export type RestaurantType = "restaurant" | "cafe";

export interface OsmRestaurant {
  id: string;
  name: string;
  type: RestaurantType;
  lat: number;
  lng: number;
  address: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  isVerified: false;
  tier: "free";
  source: "osm";
}

function classify(tags: Record<string, string>): RestaurantType | null {
  if (tags.amenity === "restaurant") return "restaurant";
  if (tags.amenity === "cafe") return "cafe";
  return null;
}

export async function fetchOsmRestaurants(
  lat: number,
  lng: number,
  radiusMi: number
): Promise<OsmRestaurant[]> {
  // 3 mi cap is the only radius that consistently completes in <2 s across
  // every density. A cyclist's coffee/lunch stop sits within 3 mi anyway.
  const effectiveRadiusMi = Math.min(radiusMi, 3);
  const radiusM = Math.round(effectiveRadiusMi * 1609.34);
  const { gridLat, gridLng } = gridSnap(lat, lng);
  const around = `around:${radiusM},${gridLat},${gridLng}`;
  // Single regex selector + name filter + node-only + 100-element cap keeps
  // the response under 50 KB. We only render the 10 closest.
  const query =
    `[out:json][timeout:20];` +
    `(` +
      `node["amenity"~"^(restaurant|cafe)$"]["name"](${around});` +
    `);` +
    `out tags center 100;`;

  // Grid-snapped cache key so the cycling dashboard's parallel /api/partners
  // hits (demo location cards + the user's actual location) all share a
  // single Overpass race instead of stampeding the public mirrors.
  const cacheKey = `restaurants:${gridLat.toFixed(2)}:${gridLng.toFixed(2)}:${effectiveRadiusMi}`;
  const data = await racedOverpass({ query, label: "osmRestaurants", cacheKey });
  if (!data) return [];

  const seen = new Set<string>();
  const out: OsmRestaurant[] = [];
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
      description: tags.cuisine ?? null,
      isVerified: false,
      tier: "free",
      source: "osm",
    });
  }
  return out;
}
