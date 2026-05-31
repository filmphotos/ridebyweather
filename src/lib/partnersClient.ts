// Client-side dedup + cache for /api/partners. The cycling dashboard renders
// both <RouteMap> and <NearbyPartners>, each of which used to fire its own
// /api/partners call on mount with identical params. Behind the scenes that
// doubled our Overpass mirror load and made the bathroom layer empty when
// mirrors throttled. This helper:
//   1) Coalesces concurrent in-flight requests onto a single promise
//   2) Caches the resolved payload for 30 s per unique key
// Drop-in replacement for `fetch('/api/partners?...')` at the call sites.

export interface PartnersResponse {
  partners?: unknown[];
  medical?: unknown[];
  restaurants?: unknown[];
  bathrooms?: unknown[];
  // Raw per-source counts (pre-filter). The shape varies by sport — surfaced
  // in the empty-state UI so we can see whether a source is dry or broken.
  sources?: Record<string, number>;
}

type CacheEntry = { at: number; data: PartnersResponse | Promise<PartnersResponse> };
const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 30_000;

function key(lat: number, lng: number, sport: string, radiusMi: number): string {
  // Round to 4 dp (~11 m) so trivial GPS jitter doesn't bust the cache.
  return `${lat.toFixed(4)}:${lng.toFixed(4)}:${sport}:${radiusMi}`;
}

export interface FetchPartnersOptions {
  lat: number;
  lng: number;
  sport?: string;
  radiusMi?: number;
  signal?: AbortSignal;
}

export async function fetchPartners(opts: FetchPartnersOptions): Promise<PartnersResponse> {
  const { lat, lng, sport = "cycling", radiusMi = 25, signal } = opts;
  const k = key(lat, lng, sport, radiusMi);
  const hit = CACHE.get(k);
  if (hit && Date.now() - hit.at < TTL_MS) {
    // Resolved value OR in-flight promise — both awaitable.
    return Promise.resolve(hit.data);
  }

  // Deliberately don't forward the per-caller AbortSignal into the shared
  // fetch — the first unmount would otherwise cancel the request for every
  // concurrent caller. Instead, the awaiting caller honors `signal` by
  // racing the shared promise against an abort rejection.
  const work: Promise<PartnersResponse> = (async () => {
    const res = await fetch(
      `/api/partners?lat=${lat}&lng=${lng}&sport=${encodeURIComponent(sport)}&radius=${radiusMi}`,
      { credentials: "include" }
    );
    if (!res.ok) throw new Error(`Partners ${res.status}`);
    const data = (await res.json()) as PartnersResponse;
    CACHE.set(k, { at: Date.now(), data });
    return data;
  })();

  CACHE.set(k, { at: Date.now(), data: work });
  // On rejection, evict so the next call retries instead of serving the
  // poisoned in-flight promise forever.
  work.catch(() => {
    const cur = CACHE.get(k);
    if (cur && cur.data === work) CACHE.delete(k);
  });

  if (!signal) return work;
  return new Promise<PartnersResponse>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
    work
      .then((d) => { signal.removeEventListener("abort", onAbort); resolve(d); })
      .catch((e) => { signal.removeEventListener("abort", onAbort); reject(e); });
  });
}
