import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { computeCyclingScore } from "@/lib/ride-score";
import { getWeatherProvider } from "@/lib/weather";
import { verifyToken } from "@/lib/auth";

const QuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  routeBearing: z.coerce.number().optional(),
});

export async function GET(req: NextRequest) {
  const token = req.cookies.get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = QuerySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { lat, lng, routeBearing } = parsed.data;

  try {
    const provider = getWeatherProvider();
    const weather = await provider.getCurrentWeather({ lat, lng });
    weather.routeBearingDeg = routeBearing;

    const result = computeCyclingScore(weather);

    return NextResponse.json({
      score: result.score,
      label: result.label,
      color: result.hexColor,
      explanation: result.explanation,
      breakdown: result.breakdown,
      weather: {
        tempF: weather.tempF,
        feelsLikeF: weather.feelsLikeF,
        humidity: weather.humidity,
        windSpeedMph: weather.windSpeedMph,
        windGustMph: weather.windGustMph,
        windDirDeg: weather.windDirDeg,
        precipProb: weather.precipProb,
        condition: weather.condition,
      },
    });
  } catch (err) {
    console.error("Ride score error:", err);
    return NextResponse.json({ error: "Failed to compute ride score" }, { status: 500 });
  }
}
