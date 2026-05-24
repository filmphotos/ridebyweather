import { NextRequest, NextResponse } from "next/server";
import { getWeatherProvider } from "@/lib/weather";
import { computeRunScore } from "@/lib/run-score";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  try {
    const provider = getWeatherProvider();
    const weather = await provider.getCurrentWeather({ lat, lng });

    const result = computeRunScore({
      tempF: weather.tempF,
      feelsLikeF: weather.feelsLikeF,
      humidity: weather.humidity,
      windSpeedMph: weather.windSpeedMph,
      precipProb: weather.precipProb,
      uvIndex: weather.uvIndex,
      condition: weather.condition,
      isStorm: weather.isStorm,
    });

    return NextResponse.json({
      ...result,
      weather: {
        tempF: weather.tempF,
        feelsLikeF: weather.feelsLikeF,
        humidity: weather.humidity,
        windSpeedMph: weather.windSpeedMph,
        windGustMph: weather.windGustMph,
        windDirDeg: weather.windDirDeg,
        precipProb: weather.precipProb,
        uvIndex: weather.uvIndex,
        condition: weather.condition,
      },
    });
  } catch (err) {
    console.error("Run score error:", err);
    return NextResponse.json({ error: "Failed to compute run score" }, { status: 500 });
  }
}
