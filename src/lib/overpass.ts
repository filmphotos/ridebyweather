// Shared Overpass helper. Public Overpass instances intermittently 504 or
// hang under load. We race the same query against three mirrors and use
// whichever responds first. We deliberately skip Next's fetch cache wrapper
// (`next.revalidate`) — empirically it adds 8–10 s of latency for the kind
// of large responses Overpass returns, even on cache misses.
const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

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

export type { OverpassElement, OverpassResponse };

export interface RacedOverpassOptions {
  query: string;
  // Per-mirror AbortController timeout. Default 10 s — fast-fail when all
  // mirrors are slow keeps the rest of the partners route responsive.
  timeoutMs?: number;
  // Label for diagnostic console logs.
  label?: string;
  // If provided, cache the result under this key for `cacheTtlMs` (default
  // 60 s). Concurrent callers with the same key dedupe onto the in-flight
  // promise — critical when the cycling dashboard fires several parallel
  // /api/partners hits and each one would otherwise re-race 3 mirrors.
  cacheKey?: string;
  cacheTtlMs?: number;
}

// Cache stores either the resolved response or the in-flight promise, so
// concurrent callers share a single Overpass hit instead of stampeding.
type CacheEntry = {
  at: number;
  data: OverpassResponse | null | Promise<OverpassResponse | null>;
};
const CACHE = new Map<string, CacheEntry>();

export async function racedOverpass(
  opts: RacedOverpassOptions
): Promise<OverpassResponse | null> {
  const { query, timeoutMs = 10000, label = "overpass", cacheKey, cacheTtlMs = 60_000 } = opts;

  if (cacheKey) {
    const hit = CACHE.get(cacheKey);
    if (hit && Date.now() - hit.at < cacheTtlMs) {
      // Pending promise OR resolved value — both awaitable.
      return Promise.resolve(hit.data);
    }
  }

  const ctrls = OVERPASS_MIRRORS.map(() => new AbortController());
  const killers = ctrls.map((c) => setTimeout(() => c.abort(), timeoutMs));

  const t0 = Date.now();
  const fetchFromMirror = async (url: string, i: number) => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "RideByWeather/1.0 (https://ridebyweather.com)",
      },
      body: "data=" + encodeURIComponent(query),
      signal: ctrls[i].signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Overpass ${url} returned ${res.status}`);
    return { res, i };
  };

  const work: Promise<OverpassResponse | null> = (async () => {
    try {
      const winner = await Promise.any(
        OVERPASS_MIRRORS.map((u, i) => fetchFromMirror(u, i))
      );
      ctrls.forEach((c, i) => { if (i !== winner.i) c.abort(); });
      killers.forEach((k) => clearTimeout(k));
      console.log(`[${label}] HTTP ${winner.res.status} in ${Date.now() - t0} ms (mirror ${winner.i})`);
      const data = (await winner.res.json()) as OverpassResponse;
      console.log(`[${label}] parsed ${(data.elements || []).length} elements in ${Date.now() - t0} ms total`);
      // Replace the in-flight Promise in the cache with the resolved value so
      // subsequent reads don't have to await again.
      if (cacheKey) CACHE.set(cacheKey, { at: Date.now(), data });
      return data;
    } catch (err) {
      killers.forEach((k) => clearTimeout(k));
      console.error(`[${label}] all mirrors failed:`, err instanceof Error ? err.message : err);
      // Cache the null only briefly (5 s vs. 60 s for success) so we recover
      // quickly when mirrors come back up, but still avoid stampede during a
      // burst failure. Negative caching with too-long TTL would leave the
      // dashboard showing zero pins for a full minute.
      if (cacheKey) CACHE.set(cacheKey, { at: Date.now() - (cacheTtlMs - 5000), data: null });
      return null;
    }
  })();

  if (cacheKey) CACHE.set(cacheKey, { at: Date.now(), data: work });
  return work;
}

export function gridSnap(lat: number, lng: number): { gridLat: number; gridLng: number } {
  // Round to 0.05° grid (~3.5 mi) so nearby queries share upstream cache entries.
  return { gridLat: Math.round(lat * 20) / 20, gridLng: Math.round(lng * 20) / 20 };
}
