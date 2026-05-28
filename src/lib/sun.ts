export interface UvCategory {
  label: string;
  color: string;
  range: string;
  advice: string;
}

export function uvCategory(uv: number): UvCategory {
  if (uv < 3)
    return { label: "Low", color: "#22c55e", range: "0–2", advice: "No protection needed for short rides." };
  if (uv < 6)
    return { label: "Moderate", color: "#eab308", range: "3–5", advice: "Sunscreen on exposed skin; sunglasses." };
  if (uv < 8)
    return { label: "High", color: "#f97316", range: "6–7", advice: "SPF 30+, arm coverage, tinted eyewear." };
  if (uv < 11)
    return { label: "Very High", color: "#ef4444", range: "8–10", advice: "Reapply SPF hourly, cover up, ride early or late." };
  return { label: "Extreme", color: "#a855f7", range: "11+", advice: "Avoid midday sun. Full coverage and frequent SPF." };
}

// Open-Meteo returns local-time ISO without a tz suffix (e.g. "2026-05-28T06:02").
// Format the clock portion directly so we never apply the runtime's timezone.
function timePart(iso: string): { h: number; m: number } | null {
  const t = iso?.split("T")[1];
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { h, m };
}

export function formatClock(iso: string): string {
  const p = timePart(iso);
  if (!p) return "—";
  const ampm = p.h >= 12 ? "PM" : "AM";
  const hh = p.h % 12 || 12;
  return `${hh}:${String(p.m).padStart(2, "0")} ${ampm}`;
}

export function minutesOfDay(iso: string): number | null {
  const p = timePart(iso);
  return p ? p.h * 60 + p.m : null;
}

export function daylightMinutes(sunriseIso: string, sunsetIso: string): number {
  const a = minutesOfDay(sunriseIso);
  const b = minutesOfDay(sunsetIso);
  if (a == null || b == null) return 0;
  return Math.max(0, b - a);
}

export function formatDuration(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

// Add/subtract minutes to a local "HH:MM" clock and reformat to 12-hour.
function shiftClock(iso: string, deltaMin: number): string {
  const base = minutesOfDay(iso);
  if (base == null) return "—";
  let mins = (base + deltaMin) % (24 * 60);
  if (mins < 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

// Lights are legally recommended/required roughly from civil dusk to civil dawn.
// Civil twilight is ~30 min outside sunrise/sunset at mid-latitudes — close enough
// for a planning prompt without an ephemeris library.
export function lightsWindow(sunriseIso: string, sunsetIso: string) {
  return {
    morningUntil: shiftClock(sunriseIso, 30),
    eveningFrom: shiftClock(sunsetIso, -30),
  };
}

export function goldenHour(sunriseIso: string, sunsetIso: string) {
  return {
    morning: `${formatClock(sunriseIso)} – ${shiftClock(sunriseIso, 60)}`,
    evening: `${shiftClock(sunsetIso, -60)} – ${formatClock(sunsetIso)}`,
  };
}
