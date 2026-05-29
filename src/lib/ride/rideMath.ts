// Geo + ride math helpers used by the live ride screen and history.

export interface TrackPoint {
  t: number;          // unix ms
  lat: number;
  lng: number;
  speedMs?: number;   // m/s — GPS speed when available, else derived
  altM?: number;      // raw GPS altitude (m)
  heading?: number;   // degrees
  accuracy?: number;  // meters (horizontal)
  hrBpm?: number;     // heart rate (bpm) from a paired BLE strap, if connected
}

export const MS_TO_MPH = 2.23694;
export const M_TO_MI = 0.000621371;
export const M_TO_FT = 3.28084;

// Haversine distance in meters
export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = (lat1 * Math.PI) / 180;
  const b = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(b);
  const x = Math.cos(a) * Math.sin(b) - Math.sin(a) * Math.cos(b) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Classify wind relative to current heading.
// windDirDeg = meteorological "from" direction. We compare against where wind is GOING (+180).
export type WindRelative = "headwind" | "tailwind" | "crosswind";
export function windRelativeTo(headingDeg: number, windDirDeg: number): WindRelative {
  const windVector = (windDirDeg + 180) % 360;
  const delta = Math.abs((((headingDeg - windVector + 540) % 360) - 180));
  if (delta <= 45) return "tailwind";
  if (delta >= 135) return "headwind";
  return "crosswind";
}

// Format seconds as h:mm:ss or m:ss.
export function fmtDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
  return `${m}:${ss.toString().padStart(2, "0")}`;
}

// Light smoothing for altitude readings to mute GPS jitter (±5–10 ft typical).
// Returns ascent/descent in feet given a window of altitudes in meters.
export function altDeltaFt(prevAltM: number, currAltM: number, minStepM: number = 1.5): { ascent: number; descent: number } {
  const deltaM = currAltM - prevAltM;
  if (Math.abs(deltaM) < minStepM) return { ascent: 0, descent: 0 };
  const ft = deltaM * M_TO_FT;
  return ft > 0 ? { ascent: ft, descent: 0 } : { ascent: 0, descent: -ft };
}

// Average altitude (m) over a +/- radius window around idx, ignoring missing values.
function avgAltM(points: TrackPoint[], idx: number, radius: number): number | null {
  let sum = 0;
  let count = 0;
  for (let j = idx - radius; j <= idx + radius; j++) {
    const a = points[j]?.altM;
    if (a != null) { sum += a; count++; }
  }
  return count > 0 ? sum / count : null;
}

// Live road grade as a percent, estimated from recent GPS points.
// GPS altitude is noisy (±3–5 m), so we measure over a horizontal window
// (default ≥80 m) and average the endpoint altitudes to mute jitter.
// Returns null when there isn't enough recent, altitude-bearing data.
export function liveGradePct(
  points: TrackPoint[],
  opts?: { minSpanM?: number; maxAgeMs?: number }
): number | null {
  const minSpanM = opts?.minSpanM ?? 80;
  const maxAgeMs = opts?.maxAgeMs ?? 30000;
  const n = points.length;
  if (n < 3) return null;
  const last = points[n - 1];
  if (last.altM == null) return null;

  // Walk backwards accumulating horizontal distance until we span minSpanM
  // (or run out of recent points).
  let i = n - 1;
  let horizM = 0;
  while (i > 0) {
    const a = points[i - 1];
    if (last.t - a.t > maxAgeMs) break;
    horizM += haversineM(a.lat, a.lng, points[i].lat, points[i].lng);
    i--;
    if (horizM >= minSpanM) break;
  }
  if (horizM < Math.min(minSpanM, 30)) return null;

  const startAlt = avgAltM(points, i, 2);
  const endAlt = avgAltM(points, n - 1, 2);
  if (startAlt == null || endAlt == null) return null;

  const grade = ((endAlt - startAlt) / horizM) * 100;
  if (!Number.isFinite(grade)) return null;
  return Math.max(-40, Math.min(40, grade));
}

// Tailwind text color for a grade %, matched to the climb-severity palette.
export function gradeColorClass(gradePct: number): string {
  const g = Math.abs(gradePct);
  if (gradePct < -2) return "text-sky-400";      // descending
  if (g < 3) return "text-gray-300";             // flat-ish
  if (gradePct < 6) return "text-yellow-400";
  if (gradePct < 9) return "text-orange-400";
  return "text-red-400";                         // brutal
}
