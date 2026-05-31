// Silca-style tire-pressure model, simplified.
// Front-bias 48/52 split, drops 10% for wet surface, 15% gravel, 25% MTB trail.
// Inputs: rider+bike system weight (lb), tire width (mm), surface, tubeless.

export type Surface = "smooth" | "rough" | "wet" | "gravel" | "mtb";

export interface PressureInput {
  systemWeightLb: number; // rider + bike + bottles
  tireWidthMm: number;
  surface: Surface;
  tubeless?: boolean;
}

export interface PressurePlan {
  frontPsi: number;
  rearPsi: number;
  note: string;
}

// Base PSI for a 28mm clincher tire on smooth pavement at 165 lb system weight.
// Pressure scales linearly with weight, inversely with the square of width.
const REF_WEIGHT_LB = 165;
const REF_WIDTH_MM = 28;
const REF_BASE_PSI = 78;

const SURFACE_MULT: Record<Surface, number> = {
  smooth: 1.0,
  rough: 0.92,
  wet: 0.9,
  gravel: 0.78,
  mtb: 0.6,
};

export function computePressure(input: PressureInput): PressurePlan {
  const w = clamp(input.systemWeightLb, 80, 380);
  const width = clamp(input.tireWidthMm, 23, 70);

  const widthRatio = REF_WIDTH_MM / width;
  const basePsi = REF_BASE_PSI * (w / REF_WEIGHT_LB) * widthRatio * widthRatio;
  const surfaceAdjusted = basePsi * SURFACE_MULT[input.surface];
  // Tubeless can safely run ~10% lower (no pinch flats).
  const tubelessAdjusted = input.tubeless ? surfaceAdjusted * 0.9 : surfaceAdjusted;

  // Real-world cap: nobody should run 110+ psi on a road tire today.
  const capped = Math.min(tubelessAdjusted, 110);
  // Front:rear ~ 48:52 (front lighter — rolls and corners better).
  const frontPsi = Math.round(capped * 0.96);
  const rearPsi = Math.round(capped * 1.04);

  let note: string;
  if (input.surface === "wet") {
    note = "Lower pressure improves grip on wet roads. Recheck before each ride — temps swing PSI.";
  } else if (input.surface === "gravel" || input.surface === "mtb") {
    note = input.tubeless
      ? "Tubeless lets you run lower for grip without pinch flats."
      : "Consider running tubeless — you can safely drop ~10% more.";
  } else if (input.surface === "smooth" && width <= 25) {
    note = "Narrow road tires reward precision — check pressure before every ride.";
  } else {
    note = "Wider tires at lower pressure roll as fast as narrow & high. Trust the math.";
  }

  return { frontPsi, rearPsi, note };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
