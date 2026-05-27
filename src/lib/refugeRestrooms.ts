// Refuge Restrooms — free public API at refugerestrooms.org. No auth, no
// rate limit per user, every entry human-submitted with real upvote/downvote
// signal. Used as the primary bathroom source because Overpass mirrors
// throttle us under load and OSM toilet tags are sparse outside major cities.
const REFUGE_URL = "https://www.refugerestrooms.org/api/v1/restrooms/by_location";

export type CleanTier = "likely_clean" | "basic" | "caution" | "unrated";

export interface RefugeBathroom {
  id: string;
  name: string;
  lat: number;
  lng: number;
  fee: boolean | null;
  wheelchair: boolean | null;
  indoor: boolean;
  supervised: boolean | null;
  drinkingWater: boolean | null;
  changingTable: boolean | null;
  openingHours: string | null;
  operator: string | null;
  cleanTier: CleanTier;
  cleanScore: number;
  cleanReasons: string[];
  source: "refuge";
}

interface RefugeRecord {
  id: number;
  name?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  accessible: boolean;
  unisex: boolean;
  directions?: string | null;
  comment?: string | null;
  latitude: number;
  longitude: number;
  upvote: number;
  downvote: number;
  changing_table: boolean;
  approved: boolean;
  distance?: number;
}

function scoreClean(r: RefugeRecord): { tier: CleanTier; score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  let signals = 0;

  // Upvote/downvote signal is the strongest input — real human feedback.
  const netVotes = r.upvote - r.downvote;
  if (netVotes >= 5) { score += 3; signals++; reasons.push(`${r.upvote} upvotes`); }
  else if (netVotes >= 2) { score += 2; signals++; reasons.push(`${r.upvote} upvotes`); }
  else if (netVotes >= 1) { score += 1; signals++; reasons.push("Upvoted"); }
  else if (netVotes <= -2) { score -= 3; signals++; reasons.push(`${r.downvote} downvotes`); }
  else if (netVotes <= -1) { score -= 1; signals++; reasons.push("Downvoted"); }

  if (r.accessible) { score += 1; signals++; reasons.push("Wheelchair access"); }
  if (r.changing_table) { score += 1; signals++; reasons.push("Changing table"); }
  if (r.unisex) { score += 1; signals++; reasons.push("All-gender"); }

  // A positive comment usually means the submitter wanted to recommend it;
  // empty comments are the default for low-engagement entries.
  if (r.comment && r.comment.trim().length > 10) { score += 1; signals++; }

  let tier: CleanTier;
  if (signals === 0) tier = "unrated";
  else if (score >= 4) tier = "likely_clean";
  else if (score >= 1) tier = "basic";
  else if (score >= 0) tier = "basic";
  else tier = "caution";

  return { tier, score, reasons };
}

function displayName(r: RefugeRecord): string {
  if (r.name && r.name.trim()) return r.name.trim();
  if (r.street) return r.street;
  return "Public restroom";
}

// In-memory cache so concurrent /api/partners calls from the dashboard share
// a single Refuge hit per grid cell. Mirrors the pattern used in
// overpass.ts; Refuge's API is fast and friendly, but caching is still good
// hygiene for repeated identical queries.
type CacheEntry = { at: number; data: RefugeBathroom[] | Promise<RefugeBathroom[]> };
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000;

export async function fetchRefugeBathrooms(
  lat: number,
  lng: number,
  radiusMi: number
): Promise<RefugeBathroom[]> {
  // Refuge sorts by distance and returns the closest matches first. 30
  // results covers any sensible map view; the route filters again by radius.
  const perPage = 30;
  // Cache keyed by 0.05° grid (~3.5 mi) so nearby callers share results.
  const gridLat = Math.round(lat * 20) / 20;
  const gridLng = Math.round(lng * 20) / 20;
  const cacheKey = `${gridLat.toFixed(2)}:${gridLng.toFixed(2)}:${perPage}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.data;
  }

  const url = `${REFUGE_URL}?lat=${lat}&lng=${lng}&page=1&per_page=${perPage}`;
  const ctrl = new AbortController();
  const killer = setTimeout(() => ctrl.abort(), 8000);

  const work: Promise<RefugeBathroom[]> = (async () => {
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { "User-Agent": "RideByWeather/1.0 (https://ridebyweather.com)" },
      });
      clearTimeout(killer);
      if (!res.ok) {
        console.error("[refugeRestrooms] HTTP", res.status);
        CACHE.set(cacheKey, { at: Date.now() - (CACHE_TTL_MS - 5000), data: [] });
        return [];
      }
      const records = (await res.json()) as RefugeRecord[];
      const out = records
        .filter((r) => r.approved && Number.isFinite(r.latitude) && Number.isFinite(r.longitude))
        .map((r): RefugeBathroom => {
          const clean = scoreClean(r);
          return {
            id: `refuge-${r.id}`,
            name: displayName(r),
            lat: r.latitude,
            lng: r.longitude,
            fee: null,
            wheelchair: r.accessible,
            indoor: true, // Refuge entries are almost always inside a business
            supervised: null,
            drinkingWater: null,
            changingTable: r.changing_table,
            openingHours: null,
            operator: r.name ?? null,
            cleanTier: clean.tier,
            cleanScore: clean.score,
            cleanReasons: clean.reasons,
            source: "refuge",
          };
        });
      console.log(`[refugeRestrooms] ${out.length} approved entries`);
      CACHE.set(cacheKey, { at: Date.now(), data: out });
      // Suppress unused-radius warning — Refuge sorts by distance internally
      // and the partners route filters by actual user distance afterward.
      void radiusMi;
      return out;
    } catch (err) {
      clearTimeout(killer);
      console.error("[refugeRestrooms] fetch failed:", err instanceof Error ? err.message : err);
      CACHE.set(cacheKey, { at: Date.now() - (CACHE_TTL_MS - 5000), data: [] });
      return [];
    }
  })();

  CACHE.set(cacheKey, { at: Date.now(), data: work });
  return work;
}
