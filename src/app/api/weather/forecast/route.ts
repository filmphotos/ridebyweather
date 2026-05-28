import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWeatherProvider } from "@/lib/weather";
import { computeCyclingScore } from "@/lib/ride-score";
import { verifyToken } from "@/lib/auth";

const QuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  hours: z.coerce.number().min(1).max(48).default(24),
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

  const { lat, lng, hours } = parsed.data;

  try {
    const provider = getWeatherProvider();
    const forecast = await provider.getHourlyForecast({ lat, lng }, hours);

    const enriched = forecast.map((f) => {
      const result = computeCyclingScore(f.weather);
      return {
        timestamp: f.timestamp,
        score: result.score,
        label: result.label,
        color: result.hexColor,
        explanation: result.explanation,
        weather: {
          tempF: f.weather.tempF,
          humidity: f.weather.humidity,
          windSpeedMph: f.weather.windSpeedMph,
          windGustMph: f.weather.windGustMph,
          windDirDeg: f.weather.windDirDeg,
          precipProb: f.weather.precipProb,
          condition: f.weather.condition,
          uvIndex: f.weather.uvIndex ?? 0,
        },
      };
    });

    return NextResponse.json({ forecast: enriched });
  } catch (err) {
    console.error("Forecast error:", err);
    return NextResponse.json({ error: "Failed to fetch forecast" }, { status: 500 });
  }
}
