import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWeatherProvider } from "@/lib/weather";
import { computeCyclingScore, type WeatherInput } from "@/lib/ride-score";
import { getAuthPayload } from "@/lib/auth";

const QuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  days: z.coerce.number().min(1).max(14).default(7),
});

export async function GET(req: NextRequest) {
  const payload = await getAuthPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = QuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { lat, lng, days } = parsed.data;

  try {
    const provider = getWeatherProvider();
    const daily = await provider.getDailyForecast({ lat, lng }, days);

    const enriched = daily.map((d) => {
      // Build a representative WeatherInput from the daily aggregates. Use the
      // warmer daytime max and the day's peak wind/gust for a worst-case score.
      const weather: WeatherInput = {
        tempF: d.tempMaxF,
        feelsLikeF: d.tempMaxF,
        humidity: 55,
        windSpeedMph: d.windSpeedMaxMph,
        windGustMph: d.windGustMaxMph,
        windDirDeg: d.windDirDeg,
        precipProb: d.precipProb,
        precipInch: 0,
        condition: d.condition,
        isStorm: d.isStorm,
        isIce: d.isIce,
        uvIndex: d.uvIndexMax,
      };
      const result = computeCyclingScore(weather);
      return {
        date: d.date,
        score: result.score,
        label: result.label,
        color: result.hexColor,
        tempMaxF: d.tempMaxF,
        tempMinF: d.tempMinF,
        precipProb: d.precipProb,
        windSpeedMaxMph: d.windSpeedMaxMph,
        windGustMaxMph: d.windGustMaxMph,
        windDirDeg: d.windDirDeg,
        uvIndexMax: d.uvIndexMax,
        sunrise: d.sunrise,
        sunset: d.sunset,
        condition: d.condition,
      };
    });

    return NextResponse.json({ daily: enriched });
  } catch (err) {
    console.error("Daily forecast error:", err);
    return NextResponse.json({ error: "Failed to fetch daily forecast" }, { status: 500 });
  }
}
