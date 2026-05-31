import { getBikeProfile, adjustWindScore, adjustTempScore, adjustGustScore, type BikeType } from "./bikeProfiles";

export interface WeatherInput {
  tempF: number;
  feelsLikeF: number;
  humidity: number;        // 0-100
  windSpeedMph: number;
  windGustMph: number;
  windDirDeg: number;      // 0-359
  precipProb: number;      // 0-1
  precipInch: number;
  condition: string;
  isStorm: boolean;
  isIce: boolean;
  uvIndex?: number;
  routeBearingDeg?: number; // overall route bearing for headwind calc
}

export interface RouteWindSegment {
  bearingDeg: number;
  distanceKm: number;
}

export interface RideScoreBreakdown {
  wind: number;
  temperature: number;
  precipitation: number;
  gustFactor: number;
  humidity: number;
  safetyOverride: number;
  windType: "headwind" | "tailwind" | "crosswind" | "none";
  windPercent: number;
  explanation: string;
}

export interface RideScoreResult {
  score: number;            // 0.0 – 10.0
  label: string;            // PERFECT | GREAT | GOOD | NEUTRAL | TOUGH | POOR | DANGEROUS
  color: string;            // tailwind color class
  hexColor: string;
  explanation: string;
  breakdown: RideScoreBreakdown;
}

// Wind angle relative to route bearing → headwind/tailwind/crosswind classification
function classifyWind(windDirDeg: number, routeBearingDeg: number): {
  type: "headwind" | "tailwind" | "crosswind";
  percent: number;
} {
  // Wind direction: where wind IS COMING FROM (meteorological convention)
  // Route bearing: direction of travel
  // Headwind when wind direction ≈ opposite of route bearing
  const windFromDeg = windDirDeg;
  const travelDeg = routeBearingDeg;

  // Angle difference between wind source and direction of travel
  let diff = Math.abs((windFromDeg - travelDeg + 360) % 360);
  if (diff > 180) diff = 360 - diff;

  // diff = 0: tailwind (wind at your back, coming from behind)
  // diff = 180: headwind (wind in your face, coming from ahead)
  const headwindFactor = Math.cos((diff * Math.PI) / 180);
  const crosswindFactor = Math.abs(Math.sin((diff * Math.PI) / 180));

  if (headwindFactor < -0.5) {
    return { type: "headwind", percent: Math.abs(headwindFactor) };
  } else if (headwindFactor > 0.5) {
    return { type: "tailwind", percent: headwindFactor };
  } else {
    return { type: "crosswind", percent: crosswindFactor };
  }
}

// Segment-based wind modeling for advanced route analysis
export function computeRouteWindScore(
  segments: RouteWindSegment[],
  windDirDeg: number,
  windSpeedMph: number
): { windScore: number; headwindPct: number; tailwindPct: number; crosswindPct: number } {
  if (!segments.length) return { windScore: 5, headwindPct: 0, tailwindPct: 0, crosswindPct: 0 };

  const totalDist = segments.reduce((sum, s) => sum + s.distanceKm, 0);
  let headwindDist = 0, tailwindDist = 0, crosswindDist = 0;
  let weightedPenalty = 0;

  for (const seg of segments) {
    const classification = classifyWind(windDirDeg, seg.bearingDeg);
    const weight = seg.distanceKm / totalDist;

    if (classification.type === "headwind") {
      headwindDist += seg.distanceKm;
      // Heavier wind → bigger penalty. Non-linear scaling.
      const penalty = classification.percent * Math.min(windSpeedMph / 15, 1.5);
      weightedPenalty += penalty * weight;
    } else if (classification.type === "tailwind") {
      tailwindDist += seg.distanceKm;
      // Tailwind bonus capped at 0.3 to avoid score inflation
      const bonus = Math.min(classification.percent * (windSpeedMph / 20), 0.3);
      weightedPenalty -= bonus * weight;
    } else {
      crosswindDist += seg.distanceKm;
      const penalty = classification.percent * Math.min(windSpeedMph / 20, 1.0) * 0.5;
      weightedPenalty += penalty * weight;
    }
  }

  // Convert penalty to 0-10 score (0 penalty = 10, max penalty ~1.5 = ~0)
  const windScore = Math.max(0, Math.min(10, 10 - weightedPenalty * 8));

  return {
    windScore,
    headwindPct: (headwindDist / totalDist) * 100,
    tailwindPct: (tailwindDist / totalDist) * 100,
    crosswindPct: (crosswindDist / totalDist) * 100,
  };
}

// Temperature comfort score for cycling (ideal 55–68°F)
function tempScoreCycling(tempF: number): number {
  if (tempF >= 55 && tempF <= 68) return 10;
  if (tempF > 68 && tempF <= 80) return 10 - ((tempF - 68) / 12) * 3; // gradual decay to 7
  if (tempF > 80 && tempF <= 95) return 7 - ((tempF - 80) / 15) * 4;  // decay to 3
  if (tempF > 95) return Math.max(0, 3 - ((tempF - 95) / 10) * 3);
  if (tempF >= 45 && tempF < 55) return 10 - ((55 - tempF) / 10) * 2; // slight decay to 8
  if (tempF >= 32 && tempF < 45) return 8 - ((45 - tempF) / 13) * 4;  // decay to 4
  if (tempF < 32) return Math.max(0, 4 - ((32 - tempF) / 10) * 4);
  return 5;
}

// Precipitation score (0–10, 0 = certain heavy rain)
function precipScore(precipProb: number, precipInch: number): number {
  const probPenalty = precipProb * 6;           // 100% prob = -6
  const intensityPenalty = Math.min(precipInch * 20, 4); // heavy rain adds up to -4
  return Math.max(0, 10 - probPenalty - intensityPenalty);
}

// Gust instability score
function gustScore(windSpeedMph: number, windGustMph: number): number {
  if (windGustMph <= windSpeedMph) return 10;
  const ratio = windGustMph / Math.max(windSpeedMph, 1);
  // ratio 1 = no gusts, ratio 2+ = very gusty
  const penalty = Math.min((ratio - 1) * 8, 8);
  const absGustPenalty = Math.min(Math.max(windGustMph - 15, 0) / 5, 4);
  return Math.max(0, 10 - penalty - absGustPenalty);
}

// Humidity comfort score
function humidityScore(humidity: number, tempF: number): number {
  if (humidity <= 60) return 10;
  if (humidity <= 80) return 10 - ((humidity - 60) / 20) * 3;
  // High humidity is worse when hot
  const heatMultiplier = tempF > 75 ? 1.5 : 1.0;
  return Math.max(0, 7 - ((humidity - 80) / 20) * 5 * heatMultiplier);
}

// Main cycling Ride Score function
export function computeCyclingScore(
  weather: WeatherInput,
  segments?: RouteWindSegment[],
  bikeType?: BikeType
): RideScoreResult {
  // Safety override: storms or ice → cap at 3
  if (weather.isStorm || weather.isIce) {
    return {
      score: weather.isStorm ? 1.0 : 2.0,
      label: "DANGEROUS",
      color: "text-red-500",
      hexColor: "#ef4444",
      explanation: weather.isStorm
        ? "Severe storm active — do not ride."
        : "Icy conditions detected — do not ride.",
      breakdown: {
        wind: 0, temperature: 0, precipitation: 0,
        gustFactor: 0, humidity: 0, safetyOverride: 0,
        windType: "none", windPercent: 0,
        explanation: "Safety override active",
      },
    };
  }

  // Wind score
  let windRaw = 10;
  let windType: "headwind" | "tailwind" | "crosswind" | "none" = "none";
  let windPercent = 0;

  if (segments && segments.length > 0) {
    const routeWind = computeRouteWindScore(segments, weather.windDirDeg, weather.windSpeedMph);
    windRaw = routeWind.windScore;
    if (routeWind.headwindPct > routeWind.tailwindPct && routeWind.headwindPct > routeWind.crosswindPct) {
      windType = "headwind"; windPercent = routeWind.headwindPct;
    } else if (routeWind.tailwindPct > routeWind.crosswindPct) {
      windType = "tailwind"; windPercent = routeWind.tailwindPct;
    } else {
      windType = "crosswind"; windPercent = routeWind.crosswindPct;
    }
  } else if (weather.routeBearingDeg !== undefined) {
    const wc = classifyWind(weather.windDirDeg, weather.routeBearingDeg);
    windType = wc.type;
    windPercent = wc.percent * 100;
    const speedPenalty = Math.min(weather.windSpeedMph / 15, 1.5);
    if (wc.type === "headwind") {
      windRaw = Math.max(0, 10 - wc.percent * speedPenalty * 8);
    } else if (wc.type === "crosswind") {
      windRaw = Math.max(0, 10 - wc.percent * speedPenalty * 4);
    } else {
      windRaw = Math.min(10, 10 + wc.percent * 1.5); // capped tailwind bonus
    }
  } else {
    // No route bearing — use wind speed alone
    windRaw = Math.max(0, 10 - Math.max(weather.windSpeedMph - 10, 0) * 0.4);
  }

  let windScore = Math.min(10, Math.max(0, windRaw));
  let tempScore = tempScoreCycling(weather.tempF);

  // Bike-type retuning: road bikes feel wind more, MTB/e-bikes less; e-bikes lose
  // range in the cold.
  const bikeProfile = getBikeProfile(bikeType);
  if (bikeProfile) {
    windScore = adjustWindScore(windScore, bikeProfile);
    tempScore = adjustTempScore(tempScore, weather.tempF, bikeProfile);
  }

  const precipS = precipScore(weather.precipProb, weather.precipInch);
  let gustS = gustScore(weather.windSpeedMph, weather.windGustMph);
  if (bikeProfile) gustS = adjustGustScore(gustS, bikeProfile);
  const humS = humidityScore(weather.humidity, weather.tempF);

  // Weighted composite (weights from spec)
  const composite =
    windScore   * 0.40 +
    tempScore   * 0.20 +
    precipS     * 0.15 +
    gustS       * 0.10 +
    humS        * 0.10;

  // Safety override component (5%) — penalize near-severe conditions
  let safetyScore = 10;
  if (weather.precipProb > 0.7 && weather.windSpeedMph > 20) safetyScore = 4;
  if (weather.tempF < 28) safetyScore = 3;

  const raw = composite * 0.95 + safetyScore * 0.05;
  const score = Math.round(Math.min(10, Math.max(0, raw)) * 10) / 10;

  const { label, color, hexColor } = scoreLabel(score);
  const explanation = buildExplanation(score, windType, windPercent, weather);

  return {
    score,
    label,
    color,
    hexColor,
    explanation,
    breakdown: {
      wind: Math.round(windScore * 10) / 10,
      temperature: Math.round(tempScore * 10) / 10,
      precipitation: Math.round(precipS * 10) / 10,
      gustFactor: Math.round(gustS * 10) / 10,
      humidity: Math.round(humS * 10) / 10,
      safetyOverride: Math.round(safetyScore * 10) / 10,
      windType,
      windPercent: Math.round(windPercent),
      explanation,
    },
  };
}

function scoreLabel(score: number): { label: string; color: string; hexColor: string } {
  if (score >= 9.5) return { label: "PERFECT",   color: "text-green-500",  hexColor: "#22c55e" };
  if (score >= 8.0) return { label: "GREAT",     color: "text-green-400",  hexColor: "#4ade80" };
  if (score >= 6.0) return { label: "GOOD",      color: "text-yellow-400", hexColor: "#facc15" };
  if (score >= 5.0) return { label: "NEUTRAL",   color: "text-yellow-500", hexColor: "#eab308" };
  if (score >= 3.0) return { label: "TOUGH",     color: "text-orange-500", hexColor: "#f97316" };
  if (score >= 1.0) return { label: "POOR",      color: "text-red-400",    hexColor: "#f87171" };
  return               { label: "DANGEROUS", color: "text-red-600",    hexColor: "#dc2626" };
}

function buildExplanation(
  score: number,
  windType: string,
  windPercent: number,
  weather: WeatherInput
): string {
  const parts: string[] = [];

  if (windType === "headwind" && windPercent > 30) {
    parts.push(`${Math.round(windPercent)}% headwind — elevated effort`);
  } else if (windType === "tailwind" && windPercent > 30) {
    parts.push(`${Math.round(windPercent)}% tailwind assist`);
  } else if (windType === "crosswind" && weather.windSpeedMph > 12) {
    parts.push(`Crosswind ${weather.windSpeedMph.toFixed(0)}mph — technical handling`);
  }

  if (weather.tempF > 90) parts.push("High heat — hydrate frequently");
  else if (weather.tempF < 35) parts.push("Near freezing — layer up");

  if (weather.precipProb > 0.6) parts.push(`${Math.round(weather.precipProb * 100)}% rain chance`);

  if (weather.windGustMph > 25) parts.push(`Gusts to ${weather.windGustMph.toFixed(0)}mph`);

  if (parts.length === 0) {
    if (score >= 8) return "Excellent riding conditions";
    if (score >= 6) return "Good conditions with minor weather effect";
    return "Manageable but expect increased effort";
  }

  return parts.join(" · ");
}
