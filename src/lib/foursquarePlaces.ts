const FSQ_URL = "https://api.foursquare.com/v3/places/search";

export interface FsqPartner {
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
  source: "foursquare";
}

interface FsqResult {
  fsq_id: string;
  name?: string;
  geocodes?: { main?: { latitude: number; longitude: number } };
  location?: { formatted_address?: string };
  tel?: string;
  website?: string;
}

interface FsqResponse {
  results?: FsqResult[];
}

export async function fetchFoursquareBikeShops(
  lat: number,
  lng: number,
  radiusMi: number
): Promise<FsqPartner[]> {
  const apiKey = process.env.FOURSQUARE_API_KEY;
  if (!apiKey) return [];

  const radiusM = Math.min(Math.round(radiusMi * 1609.34), 100000);

  const url = new URL(FSQ_URL);
  url.searchParams.set("ll", `${lat},${lng}`);
  url.searchParams.set("radius", String(radiusM));
  url.searchParams.set("query", "bike shop");
  url.searchParams.set("limit", "50");

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: apiKey, Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      console.error("Foursquare error:", res.status, await res.text());
      return [];
    }

    const data = (await res.json()) as FsqResponse;
    return (data.results ?? [])
      .filter((p) => p.name && p.geocodes?.main)
      .map((p): FsqPartner => ({
        id: `fsq-${p.fsq_id}`,
        name: p.name!,
        type: "bike_shop",
        lat: p.geocodes!.main!.latitude,
        lng: p.geocodes!.main!.longitude,
        address: p.location?.formatted_address ?? null,
        phone: p.tel ?? null,
        website: p.website ?? null,
        description: null,
        isVerified: false,
        tier: "free",
        source: "foursquare",
      }));
  } catch (err) {
    console.error("Foursquare fetch failed:", err);
    return [];
  }
}
