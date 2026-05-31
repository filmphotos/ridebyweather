// Asthma / sensitive-lungs ride safety score.
// Combines AQI, humidity, cold-air bronchospasm risk, and pollen if available
// into one safety verdict.

export interface AsthmaInput {
  aqi: number; // US EPA AQI
  pm2_5: number; // µg/m³
  ozone: number; // µg/m³
  tempF: number;
  humidity: number;
  pollenPeak?: number; // grains/m³, optional
}

export interface AsthmaVerdict {
  level: "safe" | "caution" | "high-risk" | "stay-in";
  label: string;
  color: string;
  triggers: string[];
  advice: string;
}

export function evaluateAsthma(input: AsthmaInput): AsthmaVerdict {
  const triggers: string[] = [];

  // Cold-air bronchospasm: below ~32°F, especially with hard efforts.
  if (input.tempF <= 32) triggers.push("Cold air (≤32°F) — bronchospasm risk on hard efforts");
  else if (input.tempF <= 40) triggers.push("Cool, dry air — warm up gradually");

  if (input.humidity <= 25) triggers.push("Very dry air (RH ≤ 25%) — irritates airways");
  if (input.humidity >= 90) triggers.push("Mugginess (RH ≥ 90%) — heavier breathing");

  if (input.aqi >= 101) triggers.push(`AQI ${input.aqi} — sensitive groups affected`);
  if (input.pm2_5 >= 35) triggers.push(`PM2.5 ${Math.round(input.pm2_5)} µg/m³ — small particles in lungs`);
  if (input.ozone >= 120) triggers.push("Elevated ozone — afternoon outdoor effort hits hardest");

  if ((input.pollenPeak ?? 0) >= 100) triggers.push(`High pollen (${Math.round(input.pollenPeak!)} grains/m³)`);

  let level: AsthmaVerdict["level"] = "safe";
  if (triggers.length >= 4 || input.aqi >= 200) level = "stay-in";
  else if (triggers.length >= 2 || input.aqi >= 150 || input.tempF <= 20) level = "high-risk";
  else if (triggers.length >= 1) level = "caution";

  const label = LABEL[level];
  const color = COLOR[level];
  const advice = ADVICE[level];

  return { level, label, color, triggers, advice };
}

const LABEL = { safe: "Safe to ride", caution: "Caution", "high-risk": "High risk", "stay-in": "Stay inside" } as const;
const COLOR = { safe: "#22c55e", caution: "#eab308", "high-risk": "#f97316", "stay-in": "#ef4444" } as const;
const ADVICE = {
  safe: "Normal session. Inhaler in jersey pocket if you carry one.",
  caution: "Pre-medicate per your action plan. Reduce intensity 10–15%. Carry rescue inhaler.",
  "high-risk": "Skip intervals. If you ride, stay easy, breathe through a buff in cold air, and turn around at first wheeze.",
  "stay-in": "Indoor trainer day. The air today will set off most sensitive lungs even at easy pace.",
} as const;
