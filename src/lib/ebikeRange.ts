// Estimate real-world e-bike range under specific weather and terrain.
// Spec mileage assumes lab conditions: 60-70°F, level ground, eco mode, light rider.
// Reality cuts that by 20-50% depending on wind, cold, weight, hills, and PAS level.

export type Assist = "eco" | "tour" | "sport" | "turbo";

export interface RangeInput {
  batteryWh: number;          // pack capacity (e.g. 500, 625, 750)
  manufacturerRangeMi: number; // spec sheet range under eco mode
  riderWeightLb: number;       // rider + cargo
  assist: Assist;
  tempF: number;
  windHeadwindMph: number;     // signed headwind component (negative = tailwind)
  elevationGainFt: number;     // total climbing for the planned ride
}

export interface RangeResult {
  estimatedMi: number;
  pctOfSpec: number;            // 0..1.2 (tailwind can exceed spec)
  whPerMi: number;
  caveat: string;
  breakdown: {
    factor: string;
    delta: number;              // multiplier — 1.0 = neutral
    note: string;
  }[];
}

// PAS-level multipliers — sport ~ doubles motor draw vs eco.
const ASSIST_MULT: Record<Assist, number> = {
  eco: 1.0,
  tour: 1.25,
  sport: 1.65,
  turbo: 2.1,
};

const REF_WEIGHT_LB = 165;

export function estimateRange(input: RangeInput): RangeResult {
  const breakdown: RangeResult["breakdown"] = [];

  // 1) Spec range baseline at the rated battery.
  const specWhPerMi = input.batteryWh / Math.max(1, input.manufacturerRangeMi);

  // 2) Assist level.
  const assistMult = ASSIST_MULT[input.assist];
  breakdown.push({
    factor: `Assist: ${input.assist}`,
    delta: 1 / assistMult,
    note: input.assist === "eco" ? "Lab baseline." : `Pulls ${Math.round((assistMult - 1) * 100)}% more from the battery than eco.`,
  });

  // 3) Cold battery: Li-ion drops 1-2% per 10°F below 60°F.
  let coldMult = 1;
  if (input.tempF < 60) {
    const deg = 60 - input.tempF;
    coldMult = Math.max(0.55, 1 - deg * 0.015);
  }
  if (input.tempF < 60) {
    breakdown.push({
      factor: `Cold battery (${Math.round(input.tempF)}°F)`,
      delta: coldMult,
      note: coldMult < 0.85 ? "Battery chemistry slows in the cold — meaningful range loss." : "Mild cold drag on the battery.",
    });
  }

  // 4) Headwind / tailwind.
  let windMult = 1;
  if (input.windHeadwindMph > 5) {
    windMult = Math.max(0.55, 1 - (input.windHeadwindMph - 5) * 0.025);
    breakdown.push({
      factor: `Headwind ${Math.round(input.windHeadwindMph)} mph`,
      delta: windMult,
      note: "Motor works harder — biggest single drag on range.",
    });
  } else if (input.windHeadwindMph < -5) {
    windMult = Math.min(1.15, 1 + (-input.windHeadwindMph - 5) * 0.012);
    breakdown.push({
      factor: `Tailwind ${Math.round(-input.windHeadwindMph)} mph`,
      delta: windMult,
      note: "Free help — small range bonus.",
    });
  }

  // 5) Rider weight.
  const weightMult = Math.max(0.7, Math.min(1.1, 1 - (input.riderWeightLb - REF_WEIGHT_LB) * 0.0015));
  if (Math.abs(weightMult - 1) > 0.02) {
    breakdown.push({
      factor: `Rider+cargo ${input.riderWeightLb} lb`,
      delta: weightMult,
      note: weightMult < 1 ? "Heavier load — motor compensates and burns more." : "Light load — minor bonus.",
    });
  }

  // 6) Elevation gain. ~1% range loss per 100 ft of climbing per 10 mi.
  // We can't know the distance yet; instead, fold gain into Wh/mi by assuming
  // 5 Wh per 100 ft climbed per rider for a typical 250-350W motor.
  const climbWh = (input.elevationGainFt / 100) * 5;
  if (climbWh > 0) {
    breakdown.push({
      factor: `Climbing ${Math.round(input.elevationGainFt)} ft`,
      delta: 0,
      note: `Adds about ${Math.round(climbWh)} Wh of battery use total.`,
    });
  }

  // Compose: spec Wh/mi → adjusted Wh/mi.
  const compositeMult = assistMult * (1 / coldMult) * (1 / windMult) * (1 / weightMult);
  const adjWhPerMi = specWhPerMi * compositeMult;

  // Subtract climbing energy from the battery, then divide by Wh/mi.
  const usableWh = Math.max(0, input.batteryWh - climbWh);
  const estimatedMi = Math.max(0, usableWh / Math.max(0.1, adjWhPerMi));
  const pctOfSpec = estimatedMi / Math.max(1, input.manufacturerRangeMi);

  let caveat = "";
  if (pctOfSpec < 0.55) caveat = "Real conditions are hitting your range hard — keep a charger handy or plan a bailout point.";
  else if (pctOfSpec < 0.75) caveat = "Decent margin but not the spec sheet. Plan to arrive with 20% reserve.";
  else if (pctOfSpec < 1) caveat = "Close to spec — solid riding conditions.";
  else caveat = "Conditions are actually helping you. Enjoy the bonus.";

  return {
    estimatedMi: Math.round(estimatedMi * 10) / 10,
    pctOfSpec,
    whPerMi: Math.round(adjWhPerMi),
    caveat,
    breakdown,
  };
}

// Project a headwind component (mph) from raw wind + planned route bearing.
// Positive = headwind, negative = tailwind, zero = pure crosswind.
export function headwindComponent(windDirDeg: number, windSpeedMph: number, routeBearingDeg: number): number {
  // Convention: wind direction is where wind COMES FROM. A 270° wind into a
  // route bearing of 90° (east) is a pure tailwind.
  const fromDeg = windDirDeg;
  const towardDeg = routeBearingDeg;
  // Angle between travel direction and the direction the wind is going.
  const goingDeg = (fromDeg + 180) % 360;
  let diff = Math.abs(towardDeg - goingDeg);
  if (diff > 180) diff = 360 - diff;
  // 0° = pure tailwind (+), 180° = pure headwind (-). Map to cos:
  // travel vs wind-toward angle 0 → +windSpeed (tail); 180 → -windSpeed (head).
  const projected = -windSpeedMph * Math.cos((diff * Math.PI) / 180);
  return Math.round(projected * 10) / 10;
}
