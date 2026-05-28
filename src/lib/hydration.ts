// NWS Rothfusz heat-index regression (°F). Valid at/above ~80°F; below that the
// heat index is effectively the air temperature.
export function heatIndexF(tempF: number, humidity: number): number {
  if (tempF < 80) return tempF;
  const T = tempF;
  const R = humidity;
  let hi =
    -42.379 +
    2.04901523 * T +
    10.14333127 * R -
    0.22475541 * T * R -
    0.00683783 * T * T -
    0.05481717 * R * R +
    0.00122874 * T * T * R +
    0.00085282 * T * R * R -
    0.00000199 * T * T * R * R;

  // Low-humidity and high-humidity adjustments per NWS.
  if (R < 13 && T >= 80 && T <= 112) {
    hi -= ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
  } else if (R > 85 && T >= 80 && T <= 87) {
    hi += ((R - 85) / 10) * ((87 - T) / 5);
  }
  return Math.round(hi);
}

export interface HeatCategory {
  label: string;
  color: string;
  advice: string;
}

export function heatIndexCategory(hiF: number): HeatCategory {
  if (hiF < 80)
    return { label: "Comfortable", color: "#22c55e", advice: "Normal hydration. Drink to thirst." };
  if (hiF < 91)
    return { label: "Caution", color: "#eab308", advice: "Fatigue possible on long efforts. Pre-hydrate." };
  if (hiF < 104)
    return { label: "Extreme Caution", color: "#f97316", advice: "Cramps & heat exhaustion possible. Drink on a schedule." };
  if (hiF < 126)
    return { label: "Danger", color: "#ef4444", advice: "Heat exhaustion likely. Shorten ride, seek shade." };
  return { label: "Extreme Danger", color: "#7f1d1d", advice: "Heat stroke risk. Do not ride outdoors." };
}

export type Intensity = "easy" | "moderate" | "hard";

export interface HydrationInput {
  tempF: number;
  humidity: number;
  durationMin: number;
  intensity: Intensity;
}

export interface HydrationPlan {
  mlPerHour: number;
  totalMl: number;
  totalOz: number;
  bottles: number; // 24oz / ~710ml bottles
  electrolytes: boolean;
  advice: string;
}

const BASE_SWEAT_ML: Record<Intensity, number> = {
  easy: 400,
  moderate: 600,
  hard: 850,
};

const BOTTLE_ML = 710; // 24 oz

export function hydrationPlan(input: HydrationInput): HydrationPlan {
  const hi = heatIndexF(input.tempF, input.humidity);
  // Heat multiplier: ramps from 1.0 at <=70°F HI to ~1.8 at 100°F+.
  const heatMult = 1 + Math.max(0, hi - 70) / 37.5;
  const mlPerHour = Math.round(BASE_SWEAT_ML[input.intensity] * heatMult);
  const totalMl = Math.round((mlPerHour * input.durationMin) / 60);
  const totalOz = Math.round(totalMl / 29.57);
  const bottles = Math.max(1, Math.ceil(totalMl / BOTTLE_ML));
  const electrolytes = input.durationMin > 60 || hi >= 85 || input.intensity === "hard";

  let advice: string;
  if (hi >= 104) advice = "Dangerous heat — consider rescheduling. If you ride, carry extra and stop at the first sign of trouble.";
  else if (electrolytes) advice = "Add electrolytes (sodium 500–700 mg/L). Sip every 15 min, don't wait for thirst.";
  else advice = "Plain water is fine for this effort. Drink to thirst.";

  return { mlPerHour, totalMl, totalOz, bottles, electrolytes, advice };
}
