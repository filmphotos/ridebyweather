// Calorie estimator for completed rides.
//
// Uses the standard MET formula:  kcal = MET × weight(kg) × hours
// MET values come from the 2011 Compendium of Physical Activities, picked by
// average speed. We fall back to a moderate-effort bucket when the speed is
// missing or zero.

import type { RideRecord, RideSport } from "./rideStorage";

const LB_TO_KG = 0.45359237;

interface MetInput {
  sport: RideSport;
  avgSpeedMph: number;
  ebikeMode?: boolean;
}

function metFor({ sport, avgSpeedMph, ebikeMode }: MetInput): number {
  if (sport === "running") {
    // Compendium 17200-series running METs by speed (mph).
    if (avgSpeedMph >= 10) return 14.5;
    if (avgSpeedMph >= 9) return 12.8;
    if (avgSpeedMph >= 8) return 11.8;
    if (avgSpeedMph >= 7) return 11.0;
    if (avgSpeedMph >= 6) return 9.8;
    if (avgSpeedMph >= 5) return 8.3;
    return 6.0; // slow jog
  }
  if (sport === "walking") {
    if (avgSpeedMph >= 4.5) return 6.3;
    if (avgSpeedMph >= 3.5) return 4.3;
    if (avgSpeedMph >= 2.5) return 3.0;
    return 2.0;
  }
  // Cycling
  let met: number;
  if (avgSpeedMph >= 20) return 15.8;
  if (avgSpeedMph >= 16) met = 12.0;
  else if (avgSpeedMph >= 14) met = 10.0;
  else if (avgSpeedMph >= 12) met = 8.0;
  else if (avgSpeedMph >= 10) met = 6.8;
  else if (avgSpeedMph > 0) met = 4.0;
  else met = 6.0;
  // Motor assist roughly halves the rider's exertion at a given speed.
  if (ebikeMode) met *= 0.6;
  return met;
}

/**
 * Estimate calories burned for one ride. Returns null when we don't have
 * enough info (no weight on file, no moving time recorded).
 */
export function estimateRideCalories(
  ride: Pick<RideRecord, "movingTimeSec" | "avgSpeedMph" | "sport">,
  weightLb: number | null | undefined,
  ebikeMode = false,
): number | null {
  if (!weightLb || weightLb <= 0) return null;
  if (!ride.movingTimeSec || ride.movingTimeSec <= 0) return null;
  const hours = ride.movingTimeSec / 3600;
  const kg = weightLb * LB_TO_KG;
  const met = metFor({
    sport: ride.sport ?? "cycling",
    avgSpeedMph: ride.avgSpeedMph ?? 0,
    ebikeMode,
  });
  return Math.round(met * kg * hours);
}

/** Sum of estimated calories across a list of rides. */
export function totalCalories(
  rides: Array<Pick<RideRecord, "movingTimeSec" | "avgSpeedMph" | "sport">>,
  weightLb: number | null | undefined,
  ebikeMode = false,
): number {
  if (!weightLb || weightLb <= 0) return 0;
  let sum = 0;
  for (const r of rides) {
    const c = estimateRideCalories(r, weightLb, ebikeMode);
    if (c) sum += c;
  }
  return sum;
}
