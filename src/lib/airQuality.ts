import type { WeatherLocation } from "./weather";

export interface AirQualityData {
  usAqi: number;
  pm2_5: number; // µg/m³
  pm10: number; // µg/m³
  ozone: number; // µg/m³
  no2: number; // µg/m³
}

export interface AqiCategory {
  label: string;
  color: string; // hex
  range: string;
  advice: string;
  sensitiveAdvice: string;
}

// US EPA AQI bands
export function aqiCategory(aqi: number): AqiCategory {
  if (aqi <= 50)
    return {
      label: "Good",
      color: "#22c55e",
      range: "0–50",
      advice: "Air quality is ideal. Ride anywhere, any intensity.",
      sensitiveAdvice: "No precautions needed.",
    };
  if (aqi <= 100)
    return {
      label: "Moderate",
      color: "#eab308",
      range: "51–100",
      advice: "Fine for most riders. Unusually sensitive people may notice symptoms on hard efforts.",
      sensitiveAdvice: "Consider easing intensity on long efforts.",
    };
  if (aqi <= 150)
    return {
      label: "Unhealthy for Sensitive Groups",
      color: "#f97316",
      range: "101–150",
      advice: "OK for healthy riders. Shorten hard intervals if you feel it.",
      sensitiveAdvice: "Reduce prolonged or intense outdoor exertion.",
    };
  if (aqi <= 200)
    return {
      label: "Unhealthy",
      color: "#ef4444",
      range: "151–200",
      advice: "Everyone may feel effects. Keep rides short and easy, or move indoors.",
      sensitiveAdvice: "Avoid outdoor exertion — train indoors.",
    };
  if (aqi <= 300)
    return {
      label: "Very Unhealthy",
      color: "#a855f7",
      range: "201–300",
      advice: "Health alert. Avoid outdoor riding.",
      sensitiveAdvice: "Stay indoors. Do not ride outside.",
    };
  return {
    label: "Hazardous",
    color: "#7f1d1d",
    range: "301+",
    advice: "Emergency conditions. Do not ride outdoors.",
    sensitiveAdvice: "Remain indoors with air filtration.",
  };
}

// Open-Meteo Air Quality API — free, no key, US AQI scale.
// Air quality is a distinct data source from the weather forecast, so it lives
// outside the WeatherProvider abstraction and always uses Open-Meteo.
export async function getAirQuality(loc: WeatherLocation): Promise<AirQualityData> {
  const vars = ["us_aqi", "pm2_5", "pm10", "ozone", "nitrogen_dioxide"].join(",");
  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality` +
    `?latitude=${loc.lat}&longitude=${loc.lng}&current=${vars}&timezone=auto`;
  const res = await fetch(url, { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`Air quality API error: ${res.status}`);
  const data = await res.json();
  const c = (data.current ?? {}) as Record<string, number>;
  return {
    usAqi: Math.round(c.us_aqi ?? 0),
    pm2_5: c.pm2_5 ?? 0,
    pm10: c.pm10 ?? 0,
    ozone: c.ozone ?? 0,
    no2: c.nitrogen_dioxide ?? 0,
  };
}
