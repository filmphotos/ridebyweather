import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchOsmBikeShops } from "@/lib/osmPartners";
import {
  fetchMapboxBikeShops,
  fetchMapboxRestaurants,
  fetchMapboxMedical,
} from "@/lib/mapboxSearch";
import { fetchFoursquareBikeShops } from "@/lib/foursquarePlaces";
import { fetchYelpBikeShops } from "@/lib/yelpSearch";
import { fetchOsmMedical } from "@/lib/osmMedical";
import { fetchOsmRestaurants } from "@/lib/osmRestaurants";
import { fetchOsmBathrooms } from "@/lib/osmBathrooms";
import { fetchRefugeBathrooms } from "@/lib/refugeRestrooms";
import { verifyToken } from "@/lib/auth";

// Always run fresh — don't serve a stale cached payload that might still
// contain pre-fix hospital entries.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SHOP_LIMIT = 10;
const MEDICAL_LIMIT = 5;
const RESTAURANT_LIMIT = 10;
const BATHROOM_LIMIT = 25;

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

  const [dbCandidates, yelpC, fsqC, mapboxC, osmC, medicalC, restaurantC, bathroomC, mapboxRestaurantC, mapboxMedicalC, refugeC] = await Promise.all([
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
    fetchOsmMedical(lat, lng, radiusMi),
    fetchOsmRestaurants(lat, lng, radiusMi),
    fetchOsmBathrooms(lat, lng, radiusMi),
    // Mapbox runs in parallel with OSM Overpass and serves as a fallback when
    // the public Overpass mirrors are overloaded (common in dense urban areas).
    // No Mapbox fallback for bathrooms — their Search Box API has no toilet
    // category. We use Refuge Restrooms (refugerestrooms.org) instead, which
    // has real user upvote/downvote signal and stays up when Overpass throttles.
    fetchMapboxRestaurants(lat, lng, Math.min(radiusMi, 5)),
    fetchMapboxMedical(lat, lng, Math.min(radiusMi, 10)),
    fetchRefugeBathrooms(lat, lng, radiusMi),
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
  const shopTypes = new Set(["bike_shop", "running_store", "gym"]);

  // Reject anything whose name looks medical, no matter which source returned it.
  // Belt-and-suspenders against bad category tagging in Foursquare/Yelp/OSM.
  const MEDICAL_NAME_RE = /\b(hospital|clinic|urgent\s*care|medical\s*center|health\s*center|healthcare|pharmacy|surgery|surgical|dental|dentist|veterinary|vet\s+hospital|emergency\s+room|er\b)\b/i;
  const looksMedical = (name: string) => MEDICAL_NAME_RE.test(name);

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
    .filter((p) => p.distanceMi <= radiusMi && shopTypes.has(p.type) && !looksMedical(p.name))
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
    })
    .slice(0, SHOP_LIMIT);

  // Merge OSM + Mapbox medical: OSM first (richer tagging), Mapbox fills
  // gaps when Overpass is down. Belt-and-suspenders against missing medical
  // results, which matter most when you actually need one.
  const seenMed = new Set<string>();
  const medical = [...medicalC, ...mapboxMedicalC]
    .filter((m) => {
      const k = m.name.toLowerCase().trim();
      if (seenMed.has(k)) return false;
      seenMed.add(k);
      return true;
    })
    .map((m) => ({ ...m, distanceMi: haversineMi(lat, lng, m.lat, m.lng) }))
    .filter((m) => m.distanceMi <= radiusMi)
    .sort((a, b) => {
      // Urgent care first, then hospital, then clinic; ties broken by distance
      const rank = (t: string) =>
        t === "urgent_care" ? 0 : t === "hospital" ? 1 : 2;
      return rank(a.type) - rank(b.type) || a.distanceMi - b.distanceMi;
    })
    .slice(0, MEDICAL_LIMIT);

  // Merge OSM + Mapbox restaurants: OSM first (richer cuisine tags), then
  // Mapbox to fill gaps when Overpass returns nothing. Dedup by lowercased
  // name so we don't double-list the same diner.
  const seenRest = new Set<string>();
  const restaurants = [...restaurantC, ...mapboxRestaurantC]
    .filter((r) => {
      const k = r.name.toLowerCase().trim();
      if (seenRest.has(k)) return false;
      seenRest.add(k);
      return true;
    })
    .map((r) => ({ ...r, distanceMi: haversineMi(lat, lng, r.lat, r.lng) }))
    .filter((r) => r.distanceMi <= radiusMi)
    .sort((a, b) => a.distanceMi - b.distanceMi)
    .slice(0, RESTAURANT_LIMIT);

  // Merge Refuge Restrooms (refugerestrooms.org — real user upvotes, no
  // API key, stays up when Overpass mirrors throttle) with OSM toilets.
  // Refuge first because its cleanliness signal is strongest; OSM fills
  // gaps where Refuge has no entries. Dedup by rounded coordinate (~11 m)
  // so the same toilet doesn't double-pin from both sources.
  const seenBath = new Set<string>();
  const bathrooms = [...refugeC, ...bathroomC]
    .filter((b) => {
      const k = `${b.lat.toFixed(4)},${b.lng.toFixed(4)}`;
      if (seenBath.has(k)) return false;
      seenBath.add(k);
      return true;
    })
    .map((b) => ({ ...b, distanceMi: haversineMi(lat, lng, b.lat, b.lng) }))
    .filter((b) => b.distanceMi <= radiusMi)
    .sort((a, b) => a.distanceMi - b.distanceMi)
    .slice(0, BATHROOM_LIMIT);

  return NextResponse.json({ partners: results, medical, restaurants, bathrooms });
}
