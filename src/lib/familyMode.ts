// Family-friendly riding/walking thresholds. Gentler than the adult Ride Score —
// designed for kids in a trailer or kid-pulled tagalong, or stroller-walking.

export interface FamilyInput {
  tempF: number;
  feelsLikeF: number;
  windSpeedMph: number;
  windGustMph: number;
  precipProb: number;
  uvIndex: number;
  withTrailer: boolean; // child trailer adds wind sail + tipping risk
}

export interface FamilyVerdict {
  level: "great" | "ok" | "borderline" | "not-today";
  label: string;
  color: string;
  reasons: string[];
  tips: string[];
}

export function evaluateFamily(input: FamilyInput): FamilyVerdict {
  const reasons: string[] = [];
  const tips: string[] = [];

  // Temperature comfort band (more conservative for kids).
  if (input.feelsLikeF < 32) reasons.push("Feels-like below freezing — frostnip risk on exposed cheeks");
  else if (input.feelsLikeF < 45) reasons.push("Cool — layer the kids");
  if (input.feelsLikeF >= 90) reasons.push("Hot — kids overheat faster than adults");
  if (input.feelsLikeF >= 100) reasons.push("Dangerously hot for a trailer-bound child");

  // Wind — trailers act like sails.
  const windCap = input.withTrailer ? 12 : 18;
  if (input.windSpeedMph >= windCap) reasons.push(`${Math.round(input.windSpeedMph)} mph wind ${input.withTrailer ? "+ trailer sail" : ""}`);
  if (input.windGustMph >= 25) reasons.push(`Gusts ${Math.round(input.windGustMph)} mph — bike-blowing territory`);

  if (input.precipProb >= 0.3) reasons.push("Rain expected — bring rain shell + plastic over trailer");
  if (input.uvIndex >= 6) tips.push("Sunscreen and hats — UV high");
  if (input.uvIndex >= 9) reasons.push("Extreme UV — burn risk in minutes");

  if (input.withTrailer && input.windGustMph >= 20) tips.push("With trailer + gusts: pick paths/protected lanes, not open roads");
  if (input.feelsLikeF <= 55 && input.precipProb >= 0.3) tips.push("Cold + wet hits kids hardest — postpone if possible");

  let level: FamilyVerdict["level"] = "great";
  if (reasons.length >= 3 || input.feelsLikeF >= 100 || input.feelsLikeF < 32 || input.windGustMph >= 35) level = "not-today";
  else if (reasons.length >= 2) level = "borderline";
  else if (reasons.length === 1) level = "ok";

  const label = LABEL[level];
  const color = COLOR[level];

  return { level, label, color, reasons, tips };
}

const LABEL = { great: "Great family day", ok: "OK — small caveats", borderline: "Borderline", "not-today": "Not today" } as const;
const COLOR = { great: "#22c55e", ok: "#84cc16", borderline: "#f59e0b", "not-today": "#ef4444" } as const;
