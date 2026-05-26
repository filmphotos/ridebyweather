/**
 * US state-by-state e-bike laws and restrictions.
 *
 * Sources: NCSL (National Conference of State Legislatures), PeopleForBikes
 * model legislation tracker, state DMV/DOT pages. Last reviewed: 2026-05.
 *
 * NOT LEGAL ADVICE. Laws change frequently and local jurisdictions (cities,
 * parks, HOAs) can impose stricter rules. Always verify with local authorities
 * before riding.
 *
 * Class definitions (the de facto US standard, codified in ~40 states):
 *   Class 1 — pedal-assist only, motor cuts at 20 mph
 *   Class 2 — throttle-assist allowed, motor cuts at 20 mph
 *   Class 3 — pedal-assist only, motor cuts at 28 mph
 */

export type EbikeClass = 1 | 2 | 3;

export interface StateEbikeLaw {
  state: string;
  abbr: string;
  /** State has adopted the 3-class regulatory framework */
  threeClassSystem: boolean;
  /** Minimum age to operate a Class 3 e-bike (null = no specified minimum) */
  minAgeClass3: number | null;
  /** Helmet rule summary */
  helmet: string;
  /** Where Class 1 & 2 e-bikes are generally allowed */
  bikePathAccess: "allowed" | "class1Only" | "localOption" | "restricted";
  /** Class 3 access to multi-use paths/bike paths */
  class3PathAccess: "allowed" | "roadwayOnly" | "localOption";
  /** Notable bans, restrictions, or quirks */
  notes: string;
  /** True if the state has any unusual statewide ban worth flagging */
  hasBan: boolean;
}

export const EBIKE_LAWS: StateEbikeLaw[] = [
  {
    state: "Alabama", abbr: "AL", threeClassSystem: false, minAgeClass3: null,
    helmet: "Under 16 must wear a helmet (all bicycles).",
    bikePathAccess: "localOption", class3PathAccess: "localOption",
    notes: "E-bikes regulated as 'motor-driven cycles' if over 200W or 20 mph. Lower-power e-bikes treated as bicycles. License may be required for higher-class motorized bikes.",
    hasBan: false,
  },
  {
    state: "Alaska", abbr: "AK", threeClassSystem: false, minAgeClass3: null,
    helmet: "No statewide adult helmet law.",
    bikePathAccess: "localOption", class3PathAccess: "localOption",
    notes: "No specific e-bike statute. E-bikes generally treated as bicycles if motor under 1 hp. Local municipalities set trail rules.",
    hasBan: false,
  },
  {
    state: "Arizona", abbr: "AZ", threeClassSystem: true, minAgeClass3: null,
    helmet: "Class 3 riders & passengers under 18 must wear a helmet.",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2018). Class 3 restricted from multi-use paths unless local authority allows. No license, registration, or insurance required.",
    hasBan: false,
  },
  {
    state: "Arkansas", abbr: "AR", threeClassSystem: true, minAgeClass3: null,
    helmet: "No statewide e-bike helmet requirement.",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2019). E-bikes allowed wherever traditional bicycles are, except Class 3 on shared-use paths.",
    hasBan: false,
  },
  {
    state: "California", abbr: "CA", threeClassSystem: true, minAgeClass3: 16,
    helmet: "All Class 3 riders must wear a helmet. Under 18 helmet required on any class.",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Origin of the 3-class model (2015). Class 3 banned from bike paths & trails unless local authority allows. No license/registration. Throttle on Class 3 prohibited.",
    hasBan: false,
  },
  {
    state: "Colorado", abbr: "CO", threeClassSystem: true, minAgeClass3: 16,
    helmet: "Class 3 riders/passengers under 18 must wear a helmet.",
    bikePathAccess: "allowed", class3PathAccess: "localOption",
    notes: "Adopted 3-class system (2017). Class 1 & 2 allowed on bike paths; Class 3 only where locally permitted. Many Front Range open-space trails ban all classes — check Boulder/Jefferson County rules.",
    hasBan: false,
  },
  {
    state: "Connecticut", abbr: "CT", threeClassSystem: true, minAgeClass3: 16,
    helmet: "Under 16 must wear a helmet; Class 3 helmet required for all ages.",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2019). Class 3 prohibited on bicycle paths unless authorized.",
    hasBan: false,
  },
  {
    state: "Delaware", abbr: "DE", threeClassSystem: true, minAgeClass3: 16,
    helmet: "Helmet required under 18 (all bicycles).",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2019). Standard restrictions.",
    hasBan: false,
  },
  {
    state: "Florida", abbr: "FL", threeClassSystem: true, minAgeClass3: null,
    helmet: "Under 16 must wear a helmet (all bicycles).",
    bikePathAccess: "allowed", class3PathAccess: "allowed",
    notes: "Adopted 3-class system (2020). E-bikes treated like bicycles statewide — all classes generally allowed on bike paths unless locally restricted. No license/registration.",
    hasBan: false,
  },
  {
    state: "Georgia", abbr: "GA", threeClassSystem: true, minAgeClass3: 15,
    helmet: "Under 16 must wear a helmet.",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2021). Class 3 minimum age 15. No license required.",
    hasBan: false,
  },
  {
    state: "Hawaii", abbr: "HI", threeClassSystem: false, minAgeClass3: 15,
    helmet: "Under 16 must wear a helmet.",
    bikePathAccess: "localOption", class3PathAccess: "localOption",
    notes: "E-bike riders must register the bike with the county ($30) and be 15+. Bike must be under 1 hp / 20 mph. Higher-power e-bikes (Class 3-style) treated as mopeds — license required.",
    hasBan: true,
  },
  {
    state: "Idaho", abbr: "ID", threeClassSystem: true, minAgeClass3: null,
    helmet: "No statewide helmet law.",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2020). Idaho stop applies to e-bikes too.",
    hasBan: false,
  },
  {
    state: "Illinois", abbr: "IL", threeClassSystem: true, minAgeClass3: 16,
    helmet: "No statewide helmet law (local ordinances vary).",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2018). Forest Preserve districts (Cook, DuPage) often restrict or ban e-bikes on natural-surface trails — check before riding.",
    hasBan: false,
  },
  {
    state: "Indiana", abbr: "IN", threeClassSystem: true, minAgeClass3: 15,
    helmet: "No statewide adult helmet law.",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2019). Class 3 minimum age 15.",
    hasBan: false,
  },
  {
    state: "Iowa", abbr: "IA", threeClassSystem: true, minAgeClass3: null,
    helmet: "No statewide helmet law.",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2020).",
    hasBan: false,
  },
  {
    state: "Kansas", abbr: "KS", threeClassSystem: false, minAgeClass3: null,
    helmet: "No statewide helmet law.",
    bikePathAccess: "localOption", class3PathAccess: "localOption",
    notes: "E-bikes treated as 'electric-assisted bicycles' if under 1 hp / 20 mph. Higher-power bikes treated as motorized bicycles — driver's license required.",
    hasBan: false,
  },
  {
    state: "Kentucky", abbr: "KY", threeClassSystem: false, minAgeClass3: null,
    helmet: "No statewide helmet law.",
    bikePathAccess: "localOption", class3PathAccess: "localOption",
    notes: "No specific e-bike statute. Bikes with motors typically classified as mopeds if exceeding bicycle thresholds — may require license.",
    hasBan: false,
  },
  {
    state: "Louisiana", abbr: "LA", threeClassSystem: true, minAgeClass3: 12,
    helmet: "Under 12 helmet required.",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2021). Minimum age 12 for Class 3.",
    hasBan: false,
  },
  {
    state: "Maine", abbr: "ME", threeClassSystem: true, minAgeClass3: 16,
    helmet: "Under 16 helmet required.",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2020). Acadia National Park allows Class 1 on carriage roads.",
    hasBan: false,
  },
  {
    state: "Maryland", abbr: "MD", threeClassSystem: true, minAgeClass3: 16,
    helmet: "Under 16 helmet required.",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2014, early adopter). DC area trails (C&O Canal, etc.) often restrict to Class 1.",
    hasBan: false,
  },
  {
    state: "Massachusetts", abbr: "MA", threeClassSystem: false, minAgeClass3: 16,
    helmet: "Under 17 helmet required.",
    bikePathAccess: "restricted", class3PathAccess: "roadwayOnly",
    notes: "MA still classifies e-bikes as 'motorized bicycles' under older statute — license required and bikes technically banned from bike paths and sidewalks. Class 3 essentially treated as moped. Legislation to adopt 3-class system has been pending.",
    hasBan: true,
  },
  {
    state: "Michigan", abbr: "MI", threeClassSystem: true, minAgeClass3: 14,
    helmet: "Class 3 riders under 18 must wear a helmet.",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2017). Minimum age 14 for Class 3. Class 1 allowed on natural-surface trails unless prohibited.",
    hasBan: false,
  },
  {
    state: "Minnesota", abbr: "MN", threeClassSystem: true, minAgeClass3: 15,
    helmet: "No statewide adult helmet law.",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2023). Minimum age 15 for any e-bike. State park trails often Class 1 only.",
    hasBan: false,
  },
  {
    state: "Mississippi", abbr: "MS", threeClassSystem: false, minAgeClass3: null,
    helmet: "No statewide helmet law.",
    bikePathAccess: "localOption", class3PathAccess: "localOption",
    notes: "No specific e-bike statute. Treated as bicycles if low-power; mopeds otherwise.",
    hasBan: false,
  },
  {
    state: "Missouri", abbr: "MO", threeClassSystem: true, minAgeClass3: 16,
    helmet: "No statewide adult helmet law.",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2021).",
    hasBan: false,
  },
  {
    state: "Montana", abbr: "MT", threeClassSystem: true, minAgeClass3: null,
    helmet: "No statewide helmet law.",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2021). National forest and BLM trails follow federal rules — generally motorized-vehicle rules apply.",
    hasBan: false,
  },
  {
    state: "Nebraska", abbr: "NE", threeClassSystem: false, minAgeClass3: null,
    helmet: "No statewide helmet law.",
    bikePathAccess: "localOption", class3PathAccess: "localOption",
    notes: "Treated as 'motorized bicycle' if it has a motor — Class M license required and minimum age 14 to ride. Has not adopted 3-class framework.",
    hasBan: true,
  },
  {
    state: "Nevada", abbr: "NV", threeClassSystem: true, minAgeClass3: null,
    helmet: "No statewide helmet law.",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2019). E-bikes excluded from definition of moped/motor vehicle.",
    hasBan: false,
  },
  {
    state: "New Hampshire", abbr: "NH", threeClassSystem: true, minAgeClass3: 16,
    helmet: "Under 16 helmet required.",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2020). State park trails generally Class 1 only.",
    hasBan: false,
  },
  {
    state: "New Jersey", abbr: "NJ", threeClassSystem: false, minAgeClass3: 15,
    helmet: "Under 17 helmet required.",
    bikePathAccess: "restricted", class3PathAccess: "roadwayOnly",
    notes: "NJ recognizes only Class 1 and Class 2 ('low-speed electric bicycle'). Class 3 (28 mph) treated as 'motorized bicycle' — license, registration, and insurance required. Minimum age 15.",
    hasBan: true,
  },
  {
    state: "New Mexico", abbr: "NM", threeClassSystem: true, minAgeClass3: null,
    helmet: "Under 18 helmet required.",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2022). E-bikes formally separated from mopeds.",
    hasBan: false,
  },
  {
    state: "New York", abbr: "NY", threeClassSystem: true, minAgeClass3: 16,
    helmet: "Helmet required for all Class 3 riders (NYC includes commercial Class 1/2 delivery riders). Under 14 helmet required.",
    bikePathAccess: "allowed", class3PathAccess: "localOption",
    notes: "Adopted 3-class system (2020). NYC-specific rules: throttle e-bikes were illegal until 2020 — now Class 1/2 capped at 25 mph in NYC, Class 3 capped at 25 mph for delivery riders. NYC parks ban e-bikes on most paths.",
    hasBan: false,
  },
  {
    state: "North Carolina", abbr: "NC", threeClassSystem: false, minAgeClass3: 16,
    helmet: "Under 16 helmet required.",
    bikePathAccess: "localOption", class3PathAccess: "localOption",
    notes: "E-bikes (under 750W, 20 mph) treated as bicycles. Riders must be 16+ statewide. Higher-power e-bikes treated as mopeds — moped registration required.",
    hasBan: false,
  },
  {
    state: "North Dakota", abbr: "ND", threeClassSystem: false, minAgeClass3: null,
    helmet: "No statewide helmet law.",
    bikePathAccess: "localOption", class3PathAccess: "localOption",
    notes: "No specific e-bike framework. Treated as motorized bikes if exceeding bicycle limits.",
    hasBan: false,
  },
  {
    state: "Ohio", abbr: "OH", threeClassSystem: true, minAgeClass3: 16,
    helmet: "No statewide adult helmet law.",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2020). Metro Park districts (Cleveland, Columbus) often restrict to Class 1 on natural-surface trails.",
    hasBan: false,
  },
  {
    state: "Oklahoma", abbr: "OK", threeClassSystem: true, minAgeClass3: null,
    helmet: "Under 18 helmet required (Class 3).",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2019).",
    hasBan: false,
  },
  {
    state: "Oregon", abbr: "OR", threeClassSystem: false, minAgeClass3: 16,
    helmet: "Under 16 helmet required.",
    bikePathAccess: "restricted", class3PathAccess: "roadwayOnly",
    notes: "OR defines e-bikes as motor power under 1000W and max speed 20 mph — does NOT recognize Class 3 (28 mph). Class 3-style bikes treated as mopeds. Minimum age to operate: 16. Many natural-surface trails ban e-bikes.",
    hasBan: true,
  },
  {
    state: "Pennsylvania", abbr: "PA", threeClassSystem: false, minAgeClass3: null,
    helmet: "Under 12 helmet required.",
    bikePathAccess: "restricted", class3PathAccess: "roadwayOnly",
    notes: "PA recognizes only 'pedalcycle with electric assist' — under 750W, max 20 mph, requires pedaling. Class 3 (28 mph) and throttle-only bikes not recognized and may be treated as mopeds. Minimum age 16.",
    hasBan: true,
  },
  {
    state: "Rhode Island", abbr: "RI", threeClassSystem: true, minAgeClass3: 16,
    helmet: "Under 15 helmet required.",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2022).",
    hasBan: false,
  },
  {
    state: "South Carolina", abbr: "SC", threeClassSystem: true, minAgeClass3: null,
    helmet: "No statewide helmet law.",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2022).",
    hasBan: false,
  },
  {
    state: "South Dakota", abbr: "SD", threeClassSystem: true, minAgeClass3: null,
    helmet: "No statewide helmet law.",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2019).",
    hasBan: false,
  },
  {
    state: "Tennessee", abbr: "TN", threeClassSystem: true, minAgeClass3: null,
    helmet: "Under 16 helmet required.",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2019).",
    hasBan: false,
  },
  {
    state: "Texas", abbr: "TX", threeClassSystem: true, minAgeClass3: null,
    helmet: "No statewide helmet law (local rules in Austin, Houston, etc.).",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2019). No license, registration, or insurance required. Many city greenbelt trails restrict to Class 1.",
    hasBan: false,
  },
  {
    state: "Utah", abbr: "UT", threeClassSystem: true, minAgeClass3: 14,
    helmet: "No statewide helmet law for adults.",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2019). Minimum age 14 to operate. State parks generally allow Class 1 on bike trails.",
    hasBan: false,
  },
  {
    state: "Vermont", abbr: "VT", threeClassSystem: true, minAgeClass3: 16,
    helmet: "Under 16 helmet required.",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2020).",
    hasBan: false,
  },
  {
    state: "Virginia", abbr: "VA", threeClassSystem: true, minAgeClass3: 14,
    helmet: "No statewide adult helmet law.",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2020). Minimum age 14 for Class 3.",
    hasBan: false,
  },
  {
    state: "Washington", abbr: "WA", threeClassSystem: true, minAgeClass3: 16,
    helmet: "No statewide adult helmet law (Seattle requires for all ages).",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2018). State park 'shared-use' paths generally Class 1 & 2; natural-surface trails often closed to all classes.",
    hasBan: false,
  },
  {
    state: "West Virginia", abbr: "WV", threeClassSystem: true, minAgeClass3: 15,
    helmet: "Under 15 helmet required.",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2021).",
    hasBan: false,
  },
  {
    state: "Wisconsin", abbr: "WI", threeClassSystem: true, minAgeClass3: null,
    helmet: "No statewide helmet law.",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2019). State park trails generally Class 1 only.",
    hasBan: false,
  },
  {
    state: "Wyoming", abbr: "WY", threeClassSystem: true, minAgeClass3: null,
    helmet: "No statewide helmet law.",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2020).",
    hasBan: false,
  },
  {
    state: "District of Columbia", abbr: "DC", threeClassSystem: true, minAgeClass3: 16,
    helmet: "Under 16 helmet required.",
    bikePathAccess: "allowed", class3PathAccess: "roadwayOnly",
    notes: "Adopted 3-class system (2020). National Park Service trails in DC (Rock Creek, C&O Canal towpath) follow NPS rules — generally Class 1 only.",
    hasBan: false,
  },
];

/**
 * Federal context: National Park Service generally allows Class 1 e-bikes
 * wherever traditional bicycles are allowed (since 2019 NPS policy). Class 2
 * and Class 3 are typically prohibited on NPS singletrack. US Forest Service
 * and BLM treat e-bikes as motorized vehicles by default — only allowed on
 * motorized trails unless a specific exception is granted.
 */
export const FEDERAL_LAND_SUMMARY =
  "National Park Service: Class 1 generally allowed where bicycles are; Class 2/3 usually prohibited on natural-surface trails. US Forest Service & BLM: e-bikes treated as motorized vehicles by default — restricted to motorized-use trails. Always check the specific unit before riding.";

export function getStateLaw(abbr: string): StateEbikeLaw | undefined {
  return EBIKE_LAWS.find((l) => l.abbr === abbr.toUpperCase());
}
