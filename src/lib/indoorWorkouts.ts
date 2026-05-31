// Match an indoor / trainer workout to the duration you'd have ridden outside.
// Workouts are structured as segments so we can render watt targets when the
// user has set an FTP and export a Zwift / TrainerRoad / MyWhoosh .zwo file.

export type WorkoutKind = "recovery" | "endurance" | "sweet-spot" | "vo2" | "intervals";

// A single block in a workout. `power` is fraction of FTP (0.55 = 55% FTP).
// `repeat` + `offPower`/`offSec` describe interval sets compactly.
export interface Segment {
  label: string;
  sec: number;            // length of the "on" portion
  power: number;          // 0..2 (fraction of FTP)
  repeat?: number;        // if set, this becomes an interval set
  offSec?: number;        // recovery length between reps (only with repeat)
  offPower?: number;      // recovery power (only with repeat)
  ramp?: { from: number; to: number }; // optional ramp instead of steady
}

export interface Workout {
  id: string;
  name: string;
  kind: WorkoutKind;
  durationMin: number;
  tss: number;
  description: string;
  segments: Segment[];
}

export const WORKOUTS: Workout[] = [
  {
    id: "rec-30",
    name: "Spin & spin",
    kind: "recovery",
    durationMin: 30,
    tss: 18,
    description: "30 min easy spinning, cadence > 90, Z1/Z2 only. Sub for a recovery ride.",
    segments: [
      { label: "Warm-up", sec: 300, power: 0.45 },
      { label: "Steady spin", sec: 1500, power: 0.55 },
      { label: "Cooldown", sec: 300, power: 0.40 },
    ],
  },
  {
    id: "rec-45",
    name: "Easy recovery",
    kind: "recovery",
    durationMin: 45,
    tss: 28,
    description: "45 min Z1/Z2 only. Light legs, high cadence. Great the day after a hard effort.",
    segments: [
      { label: "Warm-up", sec: 300, power: 0.45 },
      { label: "Steady spin", sec: 2100, power: 0.58 },
      { label: "Cooldown", sec: 300, power: 0.40 },
    ],
  },
  {
    id: "int-45",
    name: "VO2 5×3",
    kind: "vo2",
    durationMin: 45,
    tss: 65,
    description: "10 min warm-up, then 5×3 min @ 110–115% FTP, 3 min easy between. 10 min cooldown.",
    segments: [
      { label: "Warm-up", sec: 600, power: 0.55, ramp: { from: 0.45, to: 0.7 } },
      { label: "VO2 ×5", sec: 180, power: 1.12, repeat: 5, offSec: 180, offPower: 0.55 },
      { label: "Cooldown", sec: 600, power: 0.45 },
    ],
  },
  {
    id: "ss-60",
    name: "Sweet-spot 3×12",
    kind: "sweet-spot",
    durationMin: 60,
    tss: 78,
    description: "15 min warm-up, 3×12 min @ 88–93% FTP with 5 min easy. 12 min cooldown.",
    segments: [
      { label: "Warm-up", sec: 900, power: 0.6, ramp: { from: 0.45, to: 0.75 } },
      { label: "Sweet-spot ×3", sec: 720, power: 0.9, repeat: 3, offSec: 300, offPower: 0.55 },
      { label: "Cooldown", sec: 720, power: 0.45 },
    ],
  },
  {
    id: "end-75",
    name: "Endurance Z2",
    kind: "endurance",
    durationMin: 75,
    tss: 70,
    description: "Steady Z2 (65–75% FTP). Music or a movie — keep cadence above 85.",
    segments: [
      { label: "Warm-up", sec: 300, power: 0.55 },
      { label: "Steady Z2", sec: 3900, power: 0.7 },
      { label: "Cooldown", sec: 300, power: 0.45 },
    ],
  },
  {
    id: "ss-90",
    name: "Sweet-spot 4×15",
    kind: "sweet-spot",
    durationMin: 90,
    tss: 110,
    description: "15 min warm-up, 4×15 min @ 88–93% FTP with 5 min recovery. 10 min cooldown.",
    segments: [
      { label: "Warm-up", sec: 900, power: 0.6, ramp: { from: 0.45, to: 0.75 } },
      { label: "Sweet-spot ×4", sec: 900, power: 0.9, repeat: 4, offSec: 300, offPower: 0.55 },
      { label: "Cooldown", sec: 600, power: 0.45 },
    ],
  },
  {
    id: "int-60",
    name: "Threshold 2×20",
    kind: "intervals",
    durationMin: 60,
    tss: 85,
    description: "15 min warm-up, 2×20 min @ FTP, 8 min easy between. 10 min cooldown.",
    segments: [
      { label: "Warm-up", sec: 900, power: 0.6, ramp: { from: 0.45, to: 0.8 } },
      { label: "Threshold ×2", sec: 1200, power: 1.0, repeat: 2, offSec: 480, offPower: 0.55 },
      { label: "Cooldown", sec: 600, power: 0.45 },
    ],
  },
  {
    id: "int-75",
    name: "Over-unders 4×8",
    kind: "intervals",
    durationMin: 75,
    tss: 95,
    description: "Warm-up, then 4×8 min alternating 1 min @ 105% FTP / 1 min @ 95% FTP, 5 min between. Cooldown.",
    segments: [
      { label: "Warm-up", sec: 900, power: 0.6, ramp: { from: 0.45, to: 0.8 } },
      { label: "Over-unders ×4", sec: 480, power: 1.0, repeat: 4, offSec: 300, offPower: 0.55 },
      { label: "Cooldown", sec: 600, power: 0.45 },
    ],
  },
  {
    id: "end-120",
    name: "Long Z2",
    kind: "endurance",
    durationMin: 120,
    tss: 110,
    description: "2 hours steady Z2 with 4×30 sec spin-ups every 20 min. Movie-marathon territory.",
    segments: [
      { label: "Warm-up", sec: 300, power: 0.55 },
      { label: "Steady Z2", sec: 6600, power: 0.7 },
      { label: "Cooldown", sec: 300, power: 0.45 },
    ],
  },
];

export function pickWorkouts(intendedMin: number, score: number): Workout[] {
  const lo = intendedMin * 0.75;
  const hi = intendedMin * 1.25;
  const inBand = WORKOUTS.filter((w) => w.durationMin >= lo && w.durationMin <= hi);
  const ranked = inBand.length > 0 ? inBand : WORKOUTS;
  return ranked
    .slice()
    .sort((a, b) => {
      if (score < 4) return tssRank(a) - tssRank(b);
      return Math.abs(a.durationMin - intendedMin) - Math.abs(b.durationMin - intendedMin);
    })
    .slice(0, 3);
}

function tssRank(w: Workout): number {
  return w.kind === "recovery" ? 0 : w.kind === "endurance" ? 1 : w.kind === "sweet-spot" ? 2 : w.kind === "intervals" ? 3 : 4;
}

// Convert a fraction-of-FTP value into a watt number for display.
export function wattsAt(ftp: number | null, frac: number): number | null {
  if (!ftp) return null;
  return Math.round(ftp * frac);
}

// Build a Zwift / TrainerRoad / MyWhoosh-compatible .zwo XML string.
// Power values are fraction of FTP — the consuming app applies the user's own
// FTP, so the file is portable across riders.
export function toZwoXml(w: Workout): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const blocks = w.segments
    .map((s, i) => {
      // First segment of a workout file should be a Warmup; last a Cooldown;
      // everything in the middle is either IntervalsT or SteadyState.
      const isFirst = i === 0;
      const isLast = i === w.segments.length - 1;

      if (s.repeat && s.repeat > 1 && s.offSec != null && s.offPower != null) {
        return `    <IntervalsT Repeat="${s.repeat}" OnDuration="${s.sec}" OffDuration="${s.offSec}" OnPower="${s.power.toFixed(2)}" OffPower="${s.offPower.toFixed(2)}" Cadence="90"/>`;
      }

      if (s.ramp) {
        const tag = isFirst ? "Warmup" : isLast ? "Cooldown" : "Ramp";
        return `    <${tag} Duration="${s.sec}" PowerLow="${s.ramp.from.toFixed(2)}" PowerHigh="${s.ramp.to.toFixed(2)}"/>`;
      }

      if (isFirst) {
        return `    <Warmup Duration="${s.sec}" PowerLow="${(s.power * 0.75).toFixed(2)}" PowerHigh="${s.power.toFixed(2)}"/>`;
      }
      if (isLast) {
        return `    <Cooldown Duration="${s.sec}" PowerLow="${s.power.toFixed(2)}" PowerHigh="${(s.power * 0.75).toFixed(2)}"/>`;
      }
      return `    <SteadyState Duration="${s.sec}" Power="${s.power.toFixed(2)}"/>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<workout_file>
  <author>RideByWeather</author>
  <name>${esc(w.name)}</name>
  <description>${esc(w.description)}</description>
  <sportType>bike</sportType>
  <tags/>
  <workout>
${blocks}
  </workout>
</workout_file>
`;
}
