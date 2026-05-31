// OSM/Overpass source for bike trails: named cycle routes, MTB routes, and
// named cycleways/paths near a location. Returns a deduped, distance-sorted
// list with the most useful tags surfaced (surface, difficulty, length, ref).
import { racedOverpass, gridSnap, type OverpassElement } from "./overpass";

export type TrailKind = "cycle_route" | "mtb_route" | "cycleway" | "mtb_trail" | "path";

export interface OsmTrail {
  id: string;
  name: string;
  kind: TrailKind;
  /** Human-readable route number / reference (e.g. "USBR 50", "EV6"). */
  ref: string | null;
  /** Surface tag verbatim from OSM ("paved" / "gravel" / "dirt" / …). */
  surface: string | null;
  /** Length in miles, when OSM has a `distance` tag (km). */
  lengthMi: number | null;
  /** MTB technical difficulty (0–6 from `mtb:scale`), null if not tagged. */
  mtbScale: number | null;
  /** Network operator / club, when tagged. */
  network: string | null;
  /** Official website (OSM `website` tag), when tagged. */
  website: string | null;
  /** Wikipedia URL (constructed from `wikipedia=lang:Title`), when tagged. */
  wikipedia: string | null;
  /** Center point — used for distance + map links. */
  lat: number;
  lng: number;
  /** Great-circle distance from the query point, miles. */
  distanceMi: number;
}

function haversineMi(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function parseLengthKm(raw: string | undefined): number | null {
  if (!raw) return null;
  // OSM `distance` tag is typically a bare number in km, but tolerate
  // "42 km", "42mi", "42.5".
  const m = raw.trim().match(/^(\d+(?:\.\d+)?)\s*(km|mi|mile|miles)?$/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  const unit = (m[2] || "km").toLowerCase();
  if (unit.startsWith("mi")) return n * 1.60934; // → km
  return n;
}

function parseMtbScale(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 && n <= 6 ? n : null;
}

function wikipediaUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  // Format: "en:Article Title"
  const m = raw.match(/^([a-z-]+):(.+)$/i);
  if (!m) return null;
  return `https://${m[1]}.wikipedia.org/wiki/${encodeURIComponent(m[2].replace(/ /g, "_"))}`;
}

function classify(tags: Record<string, string>): TrailKind | null {
  if (tags.route === "bicycle") return "cycle_route";
  if (tags.route === "mtb") return "mtb_route";
  if (tags.highway === "cycleway") return "cycleway";
  if (tags.highway === "path") {
    if (tags["mtb:scale"]) return "mtb_trail";
    if (tags.bicycle === "designated" || tags.bicycle === "yes") return "path";
  }
  return null;
}

export async function fetchOsmTrails(
  lat: number,
  lng: number,
  radiusMi: number
): Promise<OsmTrail[]> {
  const radiusM = Math.round(radiusMi * 1609.34);
  const { gridLat, gridLng } = gridSnap(lat, lng);
  const around = `around:${radiusM},${gridLat},${gridLng}`;

  // Three classes of "trail":
  //   1. Long named cycle/MTB routes (relations) — greenways, USBR, EuroVelo.
  //   2. Named cycleways (ways) — rail-trails, urban paths.
  //   3. Named MTB tracks (ways with mtb:scale or bicycle=designated paths).
  const query =
    `[out:json][timeout:12];` +
    `(` +
      `relation["route"="bicycle"]["name"](${around});` +
      `relation["route"="mtb"]["name"](${around});` +
      `way["highway"="cycleway"]["name"](${around});` +
      `way["highway"="path"]["mtb:scale"](${around});` +
      `way["highway"="path"]["bicycle"="designated"]["name"](${around});` +
    `);` +
    `out center tags;`;

  const data = await racedOverpass({
    query,
    label: "osm-trails",
    timeoutMs: 14_000,
    cacheKey: `trails:${gridLat},${gridLng}:${radiusM}`,
    cacheTtlMs: 6 * 60 * 60 * 1000, // 6 h — trails don't move
  });
  if (!data?.elements) return [];

  const seen = new Set<string>();
  const trails: OsmTrail[] = [];

  for (const el of data.elements as OverpassElement[]) {
    const tags = el.tags ?? {};
    const name = tags.name?.trim();
    if (!name) continue;

    const kind = classify(tags);
    if (!kind) continue;

    const elLat = el.lat ?? el.center?.lat;
    const elLng = el.lon ?? el.center?.lon;
    if (elLat === undefined || elLng === undefined) continue;

    // Dedupe by (name + kind). Relations and ways with identical names
    // (an outer route + its constituent cycleway) collapse to one entry —
    // the relation usually wins because it sorts first in the query block.
    const key = `${kind}:${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const lengthKm = parseLengthKm(tags.distance);

    trails.push({
      id: `${el.type[0]}${el.id}`,
      name,
      kind,
      ref: tags.ref ?? null,
      surface: tags.surface ?? null,
      lengthMi: lengthKm !== null ? lengthKm / 1.60934 : null,
      mtbScale: parseMtbScale(tags["mtb:scale"]),
      network: tags.network ?? tags.operator ?? null,
      website: tags.website ?? tags["contact:website"] ?? null,
      wikipedia: wikipediaUrl(tags.wikipedia),
      lat: elLat,
      lng: elLng,
      distanceMi: haversineMi(lat, lng, elLat, elLng),
    });
  }

  trails.sort((a, b) => a.distanceMi - b.distanceMi);
  return trails;
}
