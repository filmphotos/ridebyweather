import type { WeatherInput } from "./ride-score";

export interface WeatherLocation {
  lat: number;
  lng: number;
  name?: string;
}

export interface HourlyForecast {
  timestamp: Date;
  weather: WeatherInput;
}

// Abstract provider interface — swap OpenWeather for Tomorrow.io, Pirateweather, etc.
export interface WeatherProvider {
  getCurrentWeather(loc: WeatherLocation): Promise<WeatherInput>;
  getHourlyForecast(loc: WeatherLocation, hours?: number): Promise<HourlyForecast[]>;
}

// OpenWeatherMap implementation
class OpenWeatherProvider implements WeatherProvider {
  private apiKey: string;
  private baseUrl = "https://api.openweathermap.org/data/3.0";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getCurrentWeather(loc: WeatherLocation): Promise<WeatherInput> {
    const res = await fetch(
      `${this.baseUrl}/onecall?lat=${loc.lat}&lon=${loc.lng}&exclude=minutely,daily,alerts&appid=${this.apiKey}&units=imperial`
    );
    if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
    const data = await res.json();
    return this.mapCurrentWeather(data.current, data.hourly?.[0]);
  }

  async getHourlyForecast(loc: WeatherLocation, hours = 24): Promise<HourlyForecast[]> {
    const res = await fetch(
      `${this.baseUrl}/onecall?lat=${loc.lat}&lon=${loc.lng}&exclude=minutely,daily,alerts&appid=${this.apiKey}&units=imperial`
    );
    if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
    const data = await res.json();

    return data.hourly.slice(0, hours).map((h: OWMHourly) => ({
      timestamp: new Date(h.dt * 1000),
      weather: this.mapHourlyWeather(h),
    }));
  }

  private mapCurrentWeather(current: OWMCurrent, nextHour?: OWMHourly): WeatherInput {
    const conditionId = current.weather[0]?.id ?? 800;
    return {
      tempF: current.temp,
      feelsLikeF: current.feels_like,
      humidity: current.humidity,
      windSpeedMph: current.wind_speed,
      windGustMph: current.wind_gust ?? current.wind_speed,
      windDirDeg: current.wind_deg,
      precipProb: nextHour?.pop ?? 0,
      precipInch: (current.rain?.["1h"] ?? 0) / 25.4,
      condition: current.weather[0]?.main?.toLowerCase() ?? "clear",
      isStorm: conditionId >= 200 && conditionId < 300,
      isIce: conditionId >= 600 && conditionId < 700 && current.temp < 34,
      uvIndex: current.uvi,
    };
  }

  private mapHourlyWeather(h: OWMHourly): WeatherInput {
    const conditionId = h.weather[0]?.id ?? 800;
    return {
      tempF: h.temp,
      feelsLikeF: h.feels_like,
      humidity: h.humidity,
      windSpeedMph: h.wind_speed,
      windGustMph: h.wind_gust ?? h.wind_speed,
      windDirDeg: h.wind_deg,
      precipProb: h.pop ?? 0,
      precipInch: (h.rain?.["1h"] ?? 0) / 25.4,
      condition: h.weather[0]?.main?.toLowerCase() ?? "clear",
      isStorm: conditionId >= 200 && conditionId < 300,
      isIce: conditionId >= 600 && conditionId < 700 && h.temp < 34,
    };
  }
}

// Mock provider for development/testing without an API key
export class MockWeatherProvider implements WeatherProvider {
  async getCurrentWeather(_loc: WeatherLocation): Promise<WeatherInput> {
    return {
      tempF: 62,
      feelsLikeF: 60,
      humidity: 55,
      windSpeedMph: 8,
      windGustMph: 12,
      windDirDeg: 225,
      precipProb: 0.05,
      precipInch: 0,
      condition: "clear",
      isStorm: false,
      isIce: false,
      uvIndex: 4,
    };
  }

  async getHourlyForecast(_loc: WeatherLocation, hours = 24): Promise<HourlyForecast[]> {
    const base = await this.getCurrentWeather(_loc);
    return Array.from({ length: hours }, (_, i) => ({
      timestamp: new Date(Date.now() + i * 3600 * 1000),
      weather: {
        ...base,
        tempF: base.tempF + Math.sin(i / 4) * 5,
        windSpeedMph: base.windSpeedMph + Math.random() * 4,
        precipProb: Math.max(0, base.precipProb + Math.random() * 0.1 - 0.05),
      },
    }));
  }
}

// Factory — returns real or mock provider based on env
export function getWeatherProvider(): WeatherProvider {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (apiKey && apiKey !== "your_openweather_api_key_here") {
    return new OpenWeatherProvider(apiKey);
  }
  return new MockWeatherProvider();
}

// OWM response types
interface OWMCurrent {
  dt: number;
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  wind_deg: number;
  wind_gust?: number;
  uvi?: number;
  weather: { id: number; main: string; description: string }[];
  rain?: { "1h"?: number };
}

interface OWMHourly extends OWMCurrent {
  pop: number;
}
