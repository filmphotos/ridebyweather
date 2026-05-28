export type BikeType = "road" | "gravel" | "mtb" | "commuter" | "ebike";

export interface BikeProfile {
  id: BikeType;
  label: string;
  emoji: string;
  blurb: string;
  // Multiplier on the wind penalty. >1 = more affected by wind (road), <1 = less (mtb).
  windPenaltyMult: number;
  // Extra subtraction from the temperature sub-score in the cold (e-bike battery loss).
  coldPenalty: number;
}

export const BIKE_PROFILES: BikeProfile[] = [
  { id: "road", label: "Road", emoji: "🚴", blurb: "Aero position — most exposed to wind.", windPenaltyMult: 1.3, coldPenalty: 0 },
  { id: "gravel", label: "Gravel", emoji: "🚵", blurb: "Upright, wider tires — shrugs off crosswinds.", windPenaltyMult: 0.85, coldPenalty: 0 },
  { id: "mtb", label: "Mountain", emoji: "🚲", blurb: "Low speed, sheltered trails — wind barely matters.", windPenaltyMult: 0.6, coldPenalty: 0 },
  { id: "commuter", label: "Commuter", emoji: "🛵", blurb: "Balanced everyday riding.", windPenaltyMult: 1.0, coldPenalty: 0 },
  { id: "ebike", label: "E-Bike", emoji: "⚡", blurb: "Motor fights the wind, but cold saps the battery.", windPenaltyMult: 0.55, coldPenalty: 1.5 },
];

export function getBikeProfile(id?: string | null): BikeProfile | undefined {
  if (!id) return undefined;
  return BIKE_PROFILES.find((b) => b.id === id);
}

// Scale a 0-10 wind sub-score by a bike's wind sensitivity (penalty is 10 - score).
export function adjustWindScore(windScore: number, profile: BikeProfile): number {
  const penalty = 10 - windScore;
  return Math.max(0, Math.min(10, 10 - penalty * profile.windPenaltyMult));
}

export function adjustTempScore(tempScore: number, tempF: number, profile: BikeProfile): number {
  if (profile.coldPenalty > 0 && tempF < 45) {
    return Math.max(0, tempScore - profile.coldPenalty);
  }
  return tempScore;
}
