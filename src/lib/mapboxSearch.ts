const MAPBOX_URL = "https://api.mapbox.com/search/searchbox/v1/category/bicycle_store";

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
