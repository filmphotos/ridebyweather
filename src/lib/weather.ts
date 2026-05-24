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

// Open-Meteo provider — free, no API key required
class OpenMeteoProvider implements WeatherProvider {
  private base = "https://api.open-meteo.com/v1/forecast";

  // precipitation_probability and uv_index are only in hourly, not current
  private currentVars = [
    "temperature_2m", "apparent_temperature", "relative_humidity_2m",
    "precipitation", "weather_code",
    "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
  ].join(",");

  private hourlyVars = [
    "temperature_2m", "apparent_temperature", "relative_humidity_2m",
    "precipitation_probability", "precipitation", "weather_code",
    "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m", "uv_index",
  ].join(",");

  private baseUrl(loc: WeatherLocation) {
    return (
      `${this.base}?latitude=${loc.lat}&longitude=${loc.lng}` +
      `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto`
    );
  }

  async getCurrentWeather(loc: WeatherLocation): Promise<WeatherInput> {
    // Fetch current vars + first 2 hours of hourly to get precipProb & uvIndex
    const url = `${this.baseUrl(loc)}&current=${this.currentVars}&hourly=precipitation_probability,uv_index&forecast_hours=2`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    const c = data.current as Record<string, number>;
    const precipProb = (data.hourly?.precipitation_probability?.[0] ?? 0) / 100;
    const uvIndex = data.hourly?.uv_index?.[0] ?? 0;
    return {
      tempF: c.temperature_2m ?? 60,
      feelsLikeF: c.apparent_temperature ?? 58,
      humidity: c.relative_humidity_2m ?? 50,
      windSpeedMph: c.wind_speed_10m ?? 0,
      windGustMph: c.wind_gusts_10m ?? 0,
      windDirDeg: c.wind_direction_10m ?? 0,
      precipProb,
      precipInch: c.precipitation ?? 0,
      uvIndex,
      ...this.mapCode(c.weather_code ?? 0, c.temperature_2m ?? 60),
    };
  }

  async getHourlyForecast(loc: WeatherLocation, hours = 24): Promise<HourlyForecast[]> {
    const url = `${this.baseUrl(loc)}&hourly=${this.hourlyVars}&forecast_hours=${hours}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
    const data = await res.json();
    const h = data.hourly;
    return (h.time as string[]).slice(0, hours).map((t, i) => ({
      timestamp: new Date(t),
      weather: {
        tempF: h.temperature_2m[i] ?? 60,
        feelsLikeF: h.apparent_temperature[i] ?? 58,
        humidity: h.relative_humidity_2m[i] ?? 50,
        windSpeedMph: h.wind_speed_10m[i] ?? 0,
        windGustMph: h.wind_gusts_10m[i] ?? 0,
        windDirDeg: h.wind_direction_10m[i] ?? 0,
        precipProb: (h.precipitation_probability[i] ?? 0) / 100,
        precipInch: h.precipitation[i] ?? 0,
        uvIndex: h.uv_index[i] ?? 0,
        ...this.mapCode(h.weather_code[i] ?? 0, h.temperature_2m[i] ?? 60),
      },
    }));
  }

  private mapCode(code: number, tempF: number): { condition: string; isStorm: boolean; isIce: boolean } {
    const isStorm = code >= 95;
    const isSnow = (code >= 71 && code <= 77) || code === 85 || code === 86;
    const isIce = isSnow && tempF < 34;
    const condition =
      code === 0 ? "clear" :
      code <= 3 ? "clouds" :
      code <= 48 ? "fog" :
      code <= 55 ? "drizzle" :
      code <= 65 ? "rain" :
      code <= 77 ? "snow" :
      code <= 82 ? "rain" :
      code <= 86 ? "snow" :
      "thunderstorm";
    return { condition, isStorm, isIce };
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

// Factory — Open-Meteo is default (free, no key). OpenWeather used if key is set.
export function getWeatherProvider(): WeatherProvider {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (apiKey && apiKey.length > 10) {
    return new OpenWeatherProvider(apiKey);
  }
  return new OpenMeteoProvider();
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
