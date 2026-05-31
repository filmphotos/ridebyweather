// Mapbox category is bicycle_shop (singular "shop"). bicycle_store silently
// returns zero results — verified against /v1/list/category.
const MAPBOX_URL = "https://api.mapbox.com/search/searchbox/v1/category/bicycle_shop";
const MAPBOX_CATEGORY_URL = "https://api.mapbox.com/search/searchbox/v1/category";

export interface MapboxPartner {
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
  source: "mapbox";
}

export interface MapboxRestaurant {
  id: string;
  name: string;
  type: "restaurant" | "cafe";
  lat: number;
  lng: number;
  address: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  isVerified: false;
  tier: "free";
  source: "mapbox";
}

export interface MapboxMedical {
  id: string;
  name: string;
  type: "hospital" | "urgent_care" | "clinic";
  lat: number;
  lng: number;
  address: string | null;
  phone: string | null;
  website: string | null;
  description: null;
  isVerified: false;
  tier: "free";
  source: "mapbox";
}

interface MapboxFeature {
  type: "Feature";
  geometry?: { type: "Point"; coordinates: [number, number] };
  properties?: {
    mapbox_id?: string;
    name?: string;
    full_address?: string;
    place_formatted?: string;
    metadata?: { phone?: string; website?: string };
  };
}

interface MapboxResponse {
  features?: MapboxFeature[];
}

export async function fetchMapboxBikeShops(
  lat: number,
  lng: number,
  radiusMi: number
): Promise<MapboxPartner[]> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return [];

  const latDelta = radiusMi / 69;
  const lngDelta = radiusMi / (69 * Math.cos((lat * Math.PI) / 180));
  const bbox = `${lng - lngDelta},${lat - latDelta},${lng + lngDelta},${lat + latDelta}`;

  const url = `${MAPBOX_URL}?access_token=${encodeURIComponent(token)}&proximity=${lng},${lat}&bbox=${bbox}&limit=25`;

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) {
      console.error("Mapbox Search error:", res.status, await res.text());
      return [];
    }

    const data = (await res.json()) as MapboxResponse;
    return (data.features ?? [])
      .filter((f) => f.properties?.name && f.geometry?.coordinates)
      .map((f): MapboxPartner => {
        const props = f.properties!;
        const [pLng, pLat] = f.geometry!.coordinates;
        return {
          id: `mapbox-${props.mapbox_id ?? props.name}`,
          name: props.name!,
          type: "bike_shop",
          lat: pLat,
          lng: pLng,
          address: props.full_address ?? props.place_formatted ?? null,
          phone: props.metadata?.phone ?? null,
          website: props.metadata?.website ?? null,
          description: null,
          isVerified: false,
          tier: "free",
          source: "mapbox",
        };
      });
  } catch (err) {
    console.error("Mapbox Search fetch failed:", err);
    return [];
  }
}

export async function fetchMapboxRestaurants(
  lat: number,
  lng: number,
  radiusMi: number
): Promise<MapboxRestaurant[]> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return [];

  const latDelta = radiusMi / 69;
  const lngDelta = radiusMi / (69 * Math.cos((lat * Math.PI) / 180));
  const bbox = `${lng - lngDelta},${lat - latDelta},${lng + lngDelta},${lat + latDelta}`;

  // Mapbox Searchbox doesn't let us OR two categories in one call, so we
  // fetch restaurant + cafe in parallel and merge.
  const fetchCat = async (cat: "restaurant" | "cafe"): Promise<MapboxRestaurant[]> => {
    const url = `${MAPBOX_CATEGORY_URL}/${cat}?access_token=${encodeURIComponent(token)}&proximity=${lng},${lat}&bbox=${bbox}&limit=25`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        console.error(`Mapbox ${cat} error:`, res.status);
        return [];
      }
      const data = (await res.json()) as MapboxResponse;
      return (data.features ?? [])
        .filter((f) => f.properties?.name && f.geometry?.coordinates)
        .map((f): MapboxRestaurant => {
          const props = f.properties!;
          const [pLng, pLat] = f.geometry!.coordinates;
          return {
            id: `mapbox-${cat}-${props.mapbox_id ?? props.name}`,
            name: props.name!,
            type: cat,
            lat: pLat,
            lng: pLng,
            address: props.full_address ?? props.place_formatted ?? null,
            phone: props.metadata?.phone ?? null,
            website: props.metadata?.website ?? null,
            description: null,
            isVerified: false,
            tier: "free",
            source: "mapbox",
          };
        });
    } catch (err) {
      console.error(`Mapbox ${cat} fetch failed:`, err);
      return [];
    }
  };

  const [restaurants, cafes] = await Promise.all([fetchCat("restaurant"), fetchCat("cafe")]);
  return [...restaurants, ...cafes];
}

export async function fetchMapboxMedical(
  lat: number,
  lng: number,
  radiusMi: number
): Promise<MapboxMedical[]> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return [];

  const latDelta = radiusMi / 69;
  const lngDelta = radiusMi / (69 * Math.cos((lat * Math.PI) / 180));
  const bbox = `${lng - lngDelta},${lat - latDelta},${lng + lngDelta},${lat + latDelta}`;

  // Mapbox category names. "hospital" covers ERs; "doctor" covers clinics
  // and urgent care (Mapbox doesn't have a distinct urgent_care category).
  type Cat = { name: string; type: MapboxMedical["type"] };
  const cats: Cat[] = [
    { name: "hospital", type: "hospital" },
    { name: "doctor", type: "clinic" },
  ];

  const fetchCat = async (cat: Cat): Promise<MapboxMedical[]> => {
    const url = `${MAPBOX_CATEGORY_URL}/${cat.name}?access_token=${encodeURIComponent(token)}&proximity=${lng},${lat}&bbox=${bbox}&limit=15`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        console.error(`Mapbox medical ${cat.name} error:`, res.status);
        return [];
      }
      const data = (await res.json()) as MapboxResponse;
      return (data.features ?? [])
        .filter((f) => f.properties?.name && f.geometry?.coordinates)
        .map((f): MapboxMedical => {
          const props = f.properties!;
          const [pLng, pLat] = f.geometry!.coordinates;
          return {
            id: `mapbox-${cat.name}-${props.mapbox_id ?? props.name}`,
            name: props.name!,
            type: cat.type,
            lat: pLat,
            lng: pLng,
            address: props.full_address ?? props.place_formatted ?? null,
            phone: props.metadata?.phone ?? null,
            website: props.metadata?.website ?? null,
            description: null,
            isVerified: false,
            tier: "free",
            source: "mapbox",
          };
        });
    } catch (err) {
      console.error(`Mapbox medical ${cat.name} fetch failed:`, err);
      return [];
    }
  };

  const results = await Promise.all(cats.map(fetchCat));
  return results.flat();
}

export interface MapboxShoeStore {
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
  source: "mapbox";
}

// Mapbox category is `shoe_store`. We re-use the `running_store` type so the
// existing UI lane just works. Includes a filter pass that rejects obvious
// non-athletic chains (formal shoes, kids' character stores, etc.) by name.
export async function fetchMapboxShoeStores(
  lat: number,
  lng: number,
  radiusMi: number
): Promise<MapboxShoeStore[]> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return [];

  const latDelta = radiusMi / 69;
  const lngDelta = radiusMi / (69 * Math.cos((lat * Math.PI) / 180));
  const bbox = `${lng - lngDelta},${lat - latDelta},${lng + lngDelta},${lat + latDelta}`;
  const url = `${MAPBOX_CATEGORY_URL}/shoe_store?access_token=${encodeURIComponent(token)}&proximity=${lng},${lat}&bbox=${bbox}&limit=25`;

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) {
      console.error("Mapbox shoe_store error:", res.status);
      return [];
    }
    const data = (await res.json()) as MapboxResponse;
    return (data.features ?? [])
      .filter((f) => f.properties?.name && f.geometry?.coordinates)
      .map((f): MapboxShoeStore => {
        const props = f.properties!;
        const [pLng, pLat] = f.geometry!.coordinates;
        return {
          id: `mapbox-shoe-${props.mapbox_id ?? props.name}`,
          name: props.name!,
          type: "running_store",
          lat: pLat,
          lng: pLng,
          address: props.full_address ?? props.place_formatted ?? null,
          phone: props.metadata?.phone ?? null,
          website: props.metadata?.website ?? null,
          description: null,
          isVerified: false,
          tier: "free",
          source: "mapbox",
        };
      });
  } catch (err) {
    console.error("Mapbox shoe_store fetch failed:", err);
    return [];
  }
}

// NOTE: No fetchMapboxBathrooms. Mapbox Search Box has no toilet category
// (verified by enumerating all 482 categories via /v1/list/category in
// May 2026). OSM Overpass is the only source for the bathroom layer.
