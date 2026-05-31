// Bike lane / multi-use trail closure data. v1 ships with hand-curated seed
// data for major cities so the feature is useful before live API integrations
// land. Each city has a fetcher signature so a real source (NYC 311, SFData,
// ChicagoData, City of Portland Bureau of Transportation) drops in cleanly.

export type ClosureSeverity = "advisory" | "partial" | "full";

export interface Closure {
  id: string;
  city: string;
  state: string;
  // Best-effort coordinate for a map pin (defaults to city center if unknown).
  lat: number;
  lng: number;
  street: string;
  segment: string;
  severity: ClosureSeverity;
  reason: string;
  // Optional ISO dates so the UI can render "starts/ends" copy.
  startsAt?: string;
  endsAt?: string;
  // Link out to the source notice when available.
  sourceUrl?: string;
}

export const SEED_CLOSURES: Closure[] = [
  // NYC
  {
    id: "nyc-9th-ave-chelsea",
    city: "New York City",
    state: "NY",
    lat: 40.7434,
    lng: -74.0014,
    street: "9th Ave protected lane",
    segment: "W 17th St → W 23rd St",
    severity: "partial",
    reason: "Bus shelter construction blocking northbound lane mornings.",
    endsAt: "2026-07-30",
    sourceUrl: "https://portal.311.nyc.gov/",
  },
  {
    id: "nyc-brooklyn-bridge-path",
    city: "New York City",
    state: "NY",
    lat: 40.7061,
    lng: -73.9969,
    street: "Brooklyn Bridge Greenway",
    segment: "Manhattan ramp",
    severity: "advisory",
    reason: "Heavy tourist traffic 10am–6pm — ride defensively or detour to Manhattan Bridge.",
  },
  {
    id: "nyc-east-river-greenway",
    city: "New York City",
    state: "NY",
    lat: 40.7338,
    lng: -73.9722,
    street: "East River Greenway",
    segment: "E 23rd → E 38th St",
    severity: "full",
    reason: "Seawall reconstruction. Detour via 1st Ave bike lane.",
    endsAt: "2026-09-01",
  },

  // SF
  {
    id: "sf-folsom-protected-lane",
    city: "San Francisco",
    state: "CA",
    lat: 37.7795,
    lng: -122.3988,
    street: "Folsom St protected lane",
    segment: "3rd St → Embarcadero",
    severity: "advisory",
    reason: "Construction debris reports — keep eyes on the line.",
  },
  {
    id: "sf-jfk-promenade",
    city: "San Francisco",
    state: "CA",
    lat: 37.7705,
    lng: -122.4862,
    street: "JFK Promenade (Golden Gate Park)",
    segment: "Stanyan → Crossover Dr",
    severity: "advisory",
    reason: "Weekend events close adjacent streets — promenade fine, exits crowded.",
  },
  {
    id: "sf-valencia-bike-lane",
    city: "San Francisco",
    state: "CA",
    lat: 37.7591,
    lng: -122.4214,
    street: "Valencia St protected lane",
    segment: "15th St → 23rd St",
    severity: "partial",
    reason: "Center-running pilot construction; door zone risk on parked-car side.",
    endsAt: "2026-08-15",
  },

  // Chicago
  {
    id: "chi-lakefront-oak-st-curve",
    city: "Chicago",
    state: "IL",
    lat: 41.9012,
    lng: -87.6232,
    street: "Lakefront Trail",
    segment: "Oak St Curve to Navy Pier",
    severity: "partial",
    reason: "Seawall repair, single-file southbound on weekends.",
    endsAt: "2026-11-01",
  },
  {
    id: "chi-milwaukee-corridor",
    city: "Chicago",
    state: "IL",
    lat: 41.9106,
    lng: -87.6766,
    street: "Milwaukee Ave protected lane",
    segment: "Damen → Western",
    severity: "advisory",
    reason: "Construction trucks frequently park in the lane — ride alert.",
  },

  // Portland
  {
    id: "pdx-springwater-corridor",
    city: "Portland",
    state: "OR",
    lat: 45.4773,
    lng: -122.6147,
    street: "Springwater Corridor",
    segment: "SE Ivon → SE Tacoma",
    severity: "advisory",
    reason: "Frequent debris/glass reports — bring a tire plug kit.",
  },
  {
    id: "pdx-hawthorne-bridge",
    city: "Portland",
    state: "OR",
    lat: 45.5126,
    lng: -122.6701,
    street: "Hawthorne Bridge",
    segment: "South sidewalk path",
    severity: "partial",
    reason: "Deck resurfacing weekends — north sidewalk still open.",
    endsAt: "2026-07-15",
  },

  // Boulder
  {
    id: "bldr-boulder-creek-path",
    city: "Boulder",
    state: "CO",
    lat: 40.0145,
    lng: -105.2747,
    street: "Boulder Creek Path",
    segment: "Eben G. Fine Park → 9th St",
    severity: "advisory",
    reason: "High-water flow advisory — flooded sections after recent storms.",
  },

  // Austin
  {
    id: "atx-shoal-creek-path",
    city: "Austin",
    state: "TX",
    lat: 30.2862,
    lng: -97.7549,
    street: "Shoal Creek Trail",
    segment: "29th St → 38th St",
    severity: "full",
    reason: "Creek erosion mitigation; detour via Lamar bike lane.",
    endsAt: "2026-08-30",
  },
];

export function listClosureCities(): string[] {
  return Array.from(new Set(SEED_CLOSURES.map((c) => c.city))).sort();
}

export function closuresForCity(city: string): Closure[] {
  return SEED_CLOSURES.filter((c) => c.city === city).sort((a, b) => {
    const order: Record<ClosureSeverity, number> = { full: 0, partial: 1, advisory: 2 };
    return order[a.severity] - order[b.severity];
  });
}

export function severityColor(s: ClosureSeverity): string {
  return s === "full" ? "#ef4444" : s === "partial" ? "#f97316" : "#eab308";
}

export function severityLabel(s: ClosureSeverity): string {
  return s === "full" ? "Closed" : s === "partial" ? "Partial" : "Advisory";
}
