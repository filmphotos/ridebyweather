import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTemp(tempF: number, unit: "imperial" | "metric" = "imperial"): string {
  if (unit === "metric") {
    const tempC = ((tempF - 32) * 5) / 9;
    return `${Math.round(tempC)}°C`;
  }
  return `${Math.round(tempF)}°F`;
}

export function formatWind(mph: number, unit: "imperial" | "metric" = "imperial"): string {
  if (unit === "metric") {
    return `${Math.round(mph * 1.60934)} km/h`;
  }
  return `${Math.round(mph)} mph`;
}

export function windDirLabel(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

export function scoreColorClass(score: number): string {
  if (score >= 8) return "text-green-500";
  if (score >= 5) return "text-yellow-500";
  if (score >= 3) return "text-orange-500";
  return "text-red-500";
}

export function scoreBgClass(score: number): string {
  if (score >= 8) return "bg-green-500";
  if (score >= 5) return "bg-yellow-500";
  if (score >= 3) return "bg-orange-500";
  return "bg-red-500";
}

export function formatDistance(km: number, unit: "imperial" | "metric" = "imperial"): string {
  if (unit === "metric") return `${km.toFixed(1)} km`;
  return `${(km * 0.621371).toFixed(1)} mi`;
}
