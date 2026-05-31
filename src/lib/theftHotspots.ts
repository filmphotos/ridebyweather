// Bike-theft hotspot index seed data. Real city integrations (NYC, SF, Chicago
// open data portals) plug in here; for launch we ship hand-picked
// neighborhood-level scores so the UI is meaningful even before APIs land.

export interface TheftHotspot {
  city: string;
  state: string;
  neighborhood: string;
  riskScore: number; // 0..10, higher = more theft per capita
  advice: string;
}

export const HOTSPOTS: TheftHotspot[] = [
  // San Francisco
  { city: "San Francisco", state: "CA", neighborhood: "Mission District", riskScore: 8.2, advice: "U-lock + cable, never overnight outside." },
  { city: "San Francisco", state: "CA", neighborhood: "SoMa", riskScore: 7.9, advice: "Don't leave bike racks unattended after 6pm." },
  { city: "San Francisco", state: "CA", neighborhood: "Tenderloin", riskScore: 9.4, advice: "Bring the bike inside. Don't lock outside even briefly." },
  { city: "San Francisco", state: "CA", neighborhood: "Sunset", riskScore: 3.1, advice: "Standard precautions sufficient." },

  // New York
  { city: "New York City", state: "NY", neighborhood: "Lower East Side", riskScore: 8.5, advice: "Two locks. Avoid subway grates and standalone racks." },
  { city: "New York City", state: "NY", neighborhood: "Williamsburg", riskScore: 7.6, advice: "Indoor parking strongly preferred." },
  { city: "New York City", state: "NY", neighborhood: "Upper East Side", riskScore: 4.2, advice: "Lower risk, but never leave overnight on the street." },
  { city: "New York City", state: "NY", neighborhood: "Midtown", riskScore: 7.1, advice: "Tourist racks are targets — avoid." },

  // Chicago
  { city: "Chicago", state: "IL", neighborhood: "Wicker Park", riskScore: 7.4, advice: "Two locks, never wheels-only." },
  { city: "Chicago", state: "IL", neighborhood: "Loop", riskScore: 6.8, advice: "Garage parking with valet preferred for commuters." },
  { city: "Chicago", state: "IL", neighborhood: "Hyde Park", riskScore: 8.0, advice: "Campus area — register your bike with university." },

  // Portland
  { city: "Portland", state: "OR", neighborhood: "Downtown", riskScore: 8.7, advice: "Highest stolen-bike rate per capita in US. Indoor only." },
  { city: "Portland", state: "OR", neighborhood: "Hawthorne", riskScore: 6.3, advice: "Visible street parking is targeted overnight." },

  // Boulder
  { city: "Boulder", state: "CO", neighborhood: "CU Campus", riskScore: 7.2, advice: "Register with police. Most thefts are unlocked or cable-only bikes." },
  { city: "Boulder", state: "CO", neighborhood: "Pearl Street", riskScore: 5.4, advice: "Standard U-lock works for short stops." },

  // Austin
  { city: "Austin", state: "TX", neighborhood: "East Austin", riskScore: 7.0, advice: "Two locks at night, never wheels-only." },
  { city: "Austin", state: "TX", neighborhood: "UT West Campus", riskScore: 7.8, advice: "Highest student-area theft rate. Register with UTPD." },
];

export function listCities(): string[] {
  return Array.from(new Set(HOTSPOTS.map((h) => h.city))).sort();
}

export function forCity(city: string): TheftHotspot[] {
  return HOTSPOTS.filter((h) => h.city === city).sort((a, b) => b.riskScore - a.riskScore);
}

export function riskColor(score: number): string {
  if (score >= 8) return "#ef4444";
  if (score >= 6) return "#f97316";
  if (score >= 4) return "#eab308";
  return "#22c55e";
}
