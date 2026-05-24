export interface RunWeatherInput {
  tempF: number;
  feelsLikeF: number;
  humidity: number;       // 0-100
  windSpeedMph: number;
  precipProb: number;     // 0-1
  uvIndex?: number;       // 0-11+
  condition?: string;
  isStorm?: boolean;
}

export interface RunScoreBreakdown {
  temperature: number;
  humidity: number;
  precipitation: number;
  wind: number;
  airQuality: number;
  heatIndex: number;
  explanation: string;
}

export interface RunScoreResult {
  score: number;
  label: string;
  color: string;
  explanation: string;
  breakdown: RunScoreBreakdown;
}

const WEIGHTS = {
  temperature: 0.35,
  humidity: 0.20,
  precipitation: 0.15,
  wind: 0.05,
  airQuality: 0.15,
  heatIndex: 0.10,
};

function temperatureScore(tempF: number): number {
  // Optimal running temp: 45–60°F
  if (tempF >= 45 && tempF <= 60) return 10;
  if (tempF > 60 && tempF <= 65) return 9;
  if (tempF > 65 && tempF <= 70) return 8;
  if (tempF > 70 && tempF <= 75) return 7;
  if (tempF > 40 && tempF < 45) return 8;
  if (tempF > 75 && tempF <= 80) return 6;
  if (tempF > 30 && tempF <= 40) return 7;
  if (tempF > 80 && tempF <= 85) return 4;
  if (tempF > 20 && tempF <= 30) return 5;
  if (tempF > 85 && tempF <= 90) return 2.5;
  if (tempF > 10 && tempF <= 20) return 3;
  if (tempF > 90) return 1;
  return 2;
}

function humidityScore(humidity: number): number {
  if (humidity <= 40) return 10;
  if (humidity <= 50) return 9;
  if (humidity <= 60) return 8;
  if (humidity <= 70) return 6;
  if (humidity <= 80) return 4;
  if (humidity <= 88) return 2.5;
  return 1;
}

function heatIndexScore(tempF: number, humidity: number): number {
  // Penalty when hot + humid (high perceived effort)
  if (tempF < 70) return 10; // Not a concern below 70°F
  const hi = tempF + 0.33 * (humidity / 100) * 6.105 - 4; // simplified heat index
  if (hi < 80) return 10;
  if (hi < 85) return 8;
  if (hi < 90) return 6;
  if (hi < 95) return 4;
  if (hi < 103) return 2;
  return 0.5; // Dangerous heat
}

function precipitationScore(precipProb: number): number {
  if (precipProb <= 0.05) return 10;
  if (precipProb <= 0.15) return 9;
  if (precipProb <= 0.25) return 7;
  if (precipProb <= 0.40) return 5;
  if (precipProb <= 0.60) return 3;
  if (precipProb <= 0.80) return 2;
  return 1;
}

function windScore(windSpeedMph: number): number {
  // Wind matters less for running than cycling
  if (windSpeedMph <= 8) return 10;
  if (windSpeedMph <= 12) return 9;
  if (windSpeedMph <= 16) return 8;
  if (windSpeedMph <= 20) return 7;
  if (windSpeedMph <= 25) return 5;
  if (windSpeedMph <= 30) return 3;
  return 1.5;
}

function airQualityScore(uvIndex?: number): number {
  // Without a real AQI API, use UV index as a proxy
  // UV 0-2 = low, 3-5 = moderate, 6-7 = high, 8-10 = very high, 11+ = extreme
  if (uvIndex === undefined) return 8; // default: assume good air
  if (uvIndex <= 2) return 10;
  if (uvIndex <= 5) return 9;
  if (uvIndex <= 7) return 7;
  if (uvIndex <= 10) return 5;
  return 3;
}

const LABELS: [number, string, string][] = [
  [9.5, "PERFECT", "#22c55e"],
  [8.0, "GREAT",   "#4ade80"],
  [6.5, "GOOD",    "#a3e635"],
  [5.0, "FAIR",    "#eab308"],
  [3.0, "TOUGH",   "#f97316"],
  [1.0, "POOR",    "#ef4444"],
  [0,   "EXTREME", "#dc2626"],
];

function scoreLabel(score: number): [string, string] {
  for (const [threshold, label, color] of LABELS) {
    if (score >= threshold) return [label, color];
  }
  return ["EXTREME", "#dc2626"];
}

function buildExplanation(score: number, breakdown: RunScoreBreakdown, input: RunWeatherInput): string {
  const { tempF, humidity, windSpeedMph, precipProb } = input;
  if (input.isStorm) return "Dangerous storm conditions — do not run outdoors.";
  if (score >= 9) return `Perfect running weather. ${Math.round(tempF)}°F, ${humidity}% humidity — ideal conditions.`;
  if (score >= 8) return `Great conditions for a run. Comfortable temperature and manageable humidity.`;
  if (score >= 6.5) return `Good running weather. A few minor factors to keep in mind.`;
  if (score >= 5) {
    if (tempF > 80) return `Warm run. Stay hydrated and slow your pace.`;
    if (humidity > 75) return `High humidity will make this feel harder than usual.`;
    if (precipProb > 0.4) return `Good chance of rain — dress accordingly.`;
    return `Fair conditions — manageable with preparation.`;
  }
  if (score >= 3) {
    if (tempF > 88) return `Heat advisory. Very high effort required — consider treadmill or early morning.`;
    if (tempF < 20) return `Very cold. Dress in layers; protect extremities.`;
    return `Tough conditions — experienced runners only.`;
  }
  if (tempF > 95) return `Extreme heat — health risk. Avoid outdoor running.`;
  if (tempF < 10) return `Extreme cold — health risk. Avoid outdoor running.`;
  return `Poor conditions. Indoor run recommended.`;
}

export function computeRunScore(input: RunWeatherInput): RunScoreResult {
  if (input.isStorm || (input.condition && ["storm", "tornado", "hurricane"].includes(input.condition))) {
    return {
      score: 0,
      label: "EXTREME",
      color: "#dc2626",
      explanation: "Dangerous storm conditions — do not run outdoors.",
      breakdown: {
        temperature: 0, humidity: 0, precipitation: 0,
        wind: 0, airQuality: 0, heatIndex: 0,
        explanation: "Storm safety override",
      },
    };
  }

  const tempScore  = temperatureScore(input.tempF);
  const humScore   = humidityScore(input.humidity);
  const hiScore    = heatIndexScore(input.tempF, input.humidity);
  const precipScore = precipitationScore(input.precipProb);
  const windSc     = windScore(input.windSpeedMph);
  const aqScore    = airQualityScore(input.uvIndex);

  const weighted =
    tempScore   * WEIGHTS.temperature +
    humScore    * WEIGHTS.humidity +
    hiScore     * WEIGHTS.heatIndex +
    precipScore * WEIGHTS.precipitation +
    windSc      * WEIGHTS.wind +
    aqScore     * WEIGHTS.airQuality;

  const score = Math.max(0, Math.min(10, weighted));
  const [label, color] = scoreLabel(score);

  const breakdown: RunScoreBreakdown = {
    temperature: tempScore,
    humidity: humScore,
    heatIndex: hiScore,
    precipitation: precipScore,
    wind: windSc,
    airQuality: aqScore,
    explanation: buildExplanation(score, {
      temperature: tempScore, humidity: humScore, heatIndex: hiScore,
      precipitation: precipScore, wind: windSc, airQuality: aqScore,
      explanation: "",
    } as unknown as RunScoreBreakdown, input),
  };

  return {
    score: Math.round(score * 10) / 10,
    label,
    color,
    explanation: buildExplanation(score, breakdown, input),
    breakdown,
  };
}
