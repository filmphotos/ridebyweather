import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchOsmBikeShops } from "@/lib/osmPartners";
import { fetchMapboxBikeShops } from "@/lib/mapboxSearch";
import { fetchFoursquareBikeShops } from "@/lib/foursquarePlaces";
import { fetchYelpBikeShops } from "@/lib/yelpSearch";
import { verifyToken } from "@/lib/auth";

function haversineMi(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const radiusMi = parseFloat(searchParams.get("radius") ?? "25");
  const sport = searchParams.get("sport") ?? "cycling";

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  const latDelta = radiusMi / 69;
  const lngDelta = radiusMi / (69 * Math.cos((lat * Math.PI) / 180));

  const [dbCandidates, yelpC, fsqC, mapboxC, osmC] = await Promise.all([
    db.partnerListing.findMany({
      where: {
        lat: { gte: lat - latDelta, lte: lat + latDelta },
        lng: { gte: lng - lngDelta, lte: lng + lngDelta },
      },
      orderBy: [{ tier: "desc" }, { isVerified: "desc" }],
    }),
    fetchYelpBikeShops(lat, lng, radiusMi),
    fetchFoursquareBikeShops(lat, lng, radiusMi),
    fetchMapboxBikeShops(lat, lng, radiusMi),
    fetchOsmBikeShops(lat, lng, radiusMi),
  ]);

  const dbPartners = dbCandidates.map((p) => ({
    ...p,
    source: "partner" as const,
    distanceMi: haversineMi(lat, lng, p.lat, p.lng),
  }));

  // Dedup by lowercased name. Priority order: partner DB > Yelp > Foursquare > Mapbox > OSM.
  const seen = new Set(dbPartners.map((p) => p.name.toLowerCase().trim()));
  const take = <T extends { name: string; lat: number; lng: number }>(items: T[]) =>
    items
      .filter((p) => {
        const k = p.name.toLowerCase().trim();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .map((p) => ({ ...p, distanceMi: haversineMi(lat, lng, p.lat, p.lng) }));

  const yelpPartners = take(yelpC);
  const fsqPartners = take(fsqC);
  const mapboxPartners = take(mapboxC);
  const osmPartners = take(osmC);

  const relevant_types =
    sport === "running"
      ? ["running_store", "gym", "bike_shop"]
      : ["bike_shop", "gym", "running_store"];
  const primaryType = sport === "running" ? "running_store" : "bike_shop";

  type Result =
    | (typeof dbPartners)[number]
    | (typeof yelpPartners)[number]
    | (typeof fsqPartners)[number]
    | (typeof mapboxPartners)[number]
    | (typeof osmPartners)[number];

  const results = [
    ...dbPartners,
    ...yelpPartners,
    ...fsqPartners,
    ...mapboxPartners,
    ...osmPartners,
  ]
    .filter((p) => p.distanceMi <= radiusMi)
    .sort((a: Result, b: Result) => {
      const isPrimary = (p: Result) => (p.type === primaryType ? 1 : 0);
      if (isPrimary(a) !== isPrimary(b)) return isPrimary(b) - isPrimary(a);

      const tierScore = (p: Result) =>
        (p.isVerified ? 10 : 0) + (p.tier === "enterprise" ? 6 : p.tier === "pro" ? 3 : 0);
      const typeScore = (p: Result) => {
        const idx = relevant_types.indexOf(p.type);
        return idx === -1 ? 0 : relevant_types.length - idx;
      };
      return (
        tierScore(b) + typeScore(b) - (tierScore(a) + typeScore(a)) ||
        a.distanceMi - b.distanceMi
      );
    });

  return NextResponse.json({ partners: results });
}
