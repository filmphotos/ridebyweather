const YELP_URL = "https://api.yelp.com/v3/businesses/search";

export interface YelpPartner {
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
  source: "yelp";
}

interface YelpBusiness {
  id: string;
  name?: string;
  coordinates?: { latitude: number; longitude: number };
  location?: { display_address?: string[] };
  display_phone?: string;
  url?: string;
}

interface YelpResponse {
  businesses?: YelpBusiness[];
}

export async function fetchYelpBikeShops(
  lat: number,
  lng: number,
  radiusMi: number
): Promise<YelpPartner[]> {
  const apiKey = process.env.YELP_API_KEY;
  if (!apiKey) return [];

  // Yelp caps radius at 40000m (~25 mi)
  const radiusM = Math.min(Math.round(radiusMi * 1609.34), 40000);

  const url = new URL(YELP_URL);
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("radius", String(radiusM));
  url.searchParams.set("categories", "bikes");
  url.searchParams.set("limit", "50");

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      console.error("Yelp error:", res.status, await res.text());
      return [];
    }

    const data = (await res.json()) as YelpResponse;
    return (data.businesses ?? [])
      .filter((b) => b.name && b.coordinates)
      .map((b): YelpPartner => ({
        id: `yelp-${b.id}`,
        name: b.name!,
        type: "bike_shop",
        lat: b.coordinates!.latitude,
        lng: b.coordinates!.longitude,
        address: b.location?.display_address?.join(", ") ?? null,
        phone: b.display_phone ?? null,
        website: b.url ?? null,
        description: null,
        isVerified: false,
        tier: "free",
        source: "yelp",
      }));
  } catch (err) {
    console.error("Yelp fetch failed:", err);
    return [];
  }
}
