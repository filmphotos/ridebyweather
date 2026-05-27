import { racedOverpass, gridSnap } from "./overpass";

export type CleanTier = "likely_clean" | "basic" | "caution" | "unrated";

export interface OsmBathroom {
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
  source: "osm";
}

const yes = (v: string | undefined) => v === "yes" || v === "designated";
const no = (v: string | undefined) => v === "no";

function triState(v: string | undefined): boolean | null {
  if (yes(v)) return true;
  if (no(v)) return false;
  return null;
}

function recentlyChecked(tags: Record<string, string>): boolean {
  // OSM convention is ISO date in check_date, survey:date, or last_checked
  const raw = tags.check_date ?? tags["survey:date"] ?? tags.last_checked;
  if (!raw) return false;
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return false;
  const ageDays = (Date.now() - t) / 86_400_000;
  return ageDays < 365;
}

// Estimate cleanliness from amenity attributes. OSM has no real cleanliness
// rating, so this scores signals that *correlate* with maintenance:
// indoor/supervised/paid/recent-survey usually means better upkeep;
// portable/pit-latrine usually means worse. UI must label the tier as
// "estimated" — we are not claiming first-hand inspection.
function scoreClean(tags: Record<string, string>): {
  tier: CleanTier;
  score: number;
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];
  let signals = 0;

  const indoor = yes(tags.indoor) || yes(tags.building) || tags.building === "yes";
  if (indoor) { score += 2; signals++; reasons.push("Indoor"); }

  if (yes(tags.supervised)) { score += 2; signals++; reasons.push("Attended"); }

  if (yes(tags.fee)) { score += 1; signals++; reasons.push("Paid"); }
  else if (no(tags.fee)) { signals++; }

  if (yes(tags.wheelchair)) { score += 1; signals++; reasons.push("Wheelchair access"); }

  if (yes(tags.drinking_water)) { score += 1; signals++; reasons.push("Drinking water"); }

  if (yes(tags.changing_table)) { score += 1; signals++; reasons.push("Changing table"); }

  const disposal = tags["toilets:disposal"];
  if (disposal === "flush") { score += 1; signals++; reasons.push("Flush"); }
  else if (disposal === "pitlatrine" || disposal === "chemical" || disposal === "bucket") {
    score -= 2; signals++; reasons.push("Pit/chemical");
  }

  if (yes(tags.portable) || tags.toilets === "portable") {
    score -= 2; signals++; reasons.push("Portable");
  }

  if (recentlyChecked(tags)) { score += 1; signals++; reasons.push("Recently surveyed"); }

  let tier: CleanTier;
  if (signals === 0) tier = "unrated";
  else if (score >= 4) tier = "likely_clean";
  else if (score >= 1) tier = "basic";
  else if (score >= 0) tier = "basic";
  else tier = "caution";

  return { tier, score, reasons };
}

function displayName(tags: Record<string, string>): string {
  if (tags.name) return tags.name;
  if (tags.operator) return `${tags.operator} restroom`;
  if (yes(tags.fee)) return "Paid public toilet";
  return "Public toilet";
}

export async function fetchOsmBathrooms(
  lat: number,
  lng: number,
  radiusMi: number
): Promise<OsmBathroom[]> {
  // Cap at 5 mi: a bathroom further than that during a ride isn't useful,
  // and the smaller bbox keeps Manhattan-density responses under ~30 KB.
  const effectiveRadiusMi = Math.min(radiusMi, 5);
  const radiusM = Math.round(effectiveRadiusMi * 1609.34);
  const { gridLat, gridLng } = gridSnap(lat, lng);
  const around = `around:${radiusM},${gridLat},${gridLng}`;
  // `nwr` matches nodes, ways, and relations in one selector.
  const query =
    `[out:json][timeout:20];` +
    `nwr["amenity"="toilets"](${around});` +
    `out tags center 150;`;

  // Cache key snaps to the grid cell + radius. The cycling dashboard fires
  // several parallel /api/partners hits on mount (one per demo location card
  // + the user's actual location), so without dedup each one would race the
  // 3 Overpass mirrors independently — ~45 simultaneous requests to the same
  // 3 public servers, which self-throttle and return empty bathrooms. The
  // shared cache lets the first call populate it and the rest piggyback.
  const cacheKey = `bathrooms:${gridLat.toFixed(2)}:${gridLng.toFixed(2)}:${effectiveRadiusMi}`;
  const data = await racedOverpass({ query, label: "osmBathrooms", cacheKey });
  if (!data) return [];

  try {
    const seen = new Set<string>();
    const out: OsmBathroom[] = [];
    for (const e of data.elements ?? []) {
      const tags = e.tags ?? {};
      const elLat = e.lat ?? e.center?.lat;
      const elLng = e.lon ?? e.center?.lon;
      if (elLat === undefined || elLng === undefined) continue;

      // Dedup by coordinate so a node + enclosing way for the same toilet
      // don't render as two pins on top of each other.
      const key = `${elLat.toFixed(5)},${elLng.toFixed(5)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const clean = scoreClean(tags);
      out.push({
        id: `osm-${e.type}-${e.id}`,
        name: displayName(tags),
        lat: elLat,
        lng: elLng,
        fee: triState(tags.fee),
        wheelchair: triState(tags.wheelchair),
        indoor: yes(tags.indoor) || yes(tags.building) || tags.building === "yes",
        supervised: triState(tags.supervised),
        drinkingWater: triState(tags.drinking_water),
        changingTable: triState(tags.changing_table),
        openingHours: tags.opening_hours ?? null,
        operator: tags.operator ?? null,
        cleanTier: clean.tier,
        cleanScore: clean.score,
        cleanReasons: clean.reasons,
        source: "osm",
      });
    }
    return out;
  } catch (err) {
    console.error("OSM bathrooms parse failed:", err);
    return [];
  }
}
