// Match an indoor / trainer workout to the duration you'd have ridden outside.
// Loosely TSS-aware: short = intervals, mid = sweet-spot, long = endurance.

export type WorkoutKind = "recovery" | "endurance" | "sweet-spot" | "vo2" | "intervals";

export interface Workout {
  id: string;
  name: string;
  kind: WorkoutKind;
  durationMin: number;
  tss: number; // training-stress score estimate
  description: string;
}

export const WORKOUTS: Workout[] = [
  {
    id: "rec-30",
    name: "Spin & spin",
    kind: "recovery",
    durationMin: 30,
    tss: 18,
    description: "30 min easy spinning, cadence > 90, Z1/Z2 only. Sub for a recovery ride.",
  },
  {
    id: "int-45",
    name: "VO2 5×3",
    kind: "vo2",
    durationMin: 45,
    tss: 65,
    description: "10 min warm-up, then 5×3 min @ 110–115% FTP, 3 min easy between. 10 min cooldown.",
  },
  {
    id: "ss-60",
    name: "Sweet-spot 3×12",
    kind: "sweet-spot",
    durationMin: 60,
    tss: 78,
    description: "15 min warm-up, 3×12 min @ 88–93% FTP with 5 min easy. 12 min cooldown.",
  },
  {
    id: "end-75",
    name: "Endurance Z2",
    kind: "endurance",
    durationMin: 75,
    tss: 70,
    description: "Steady Z2 (65–75% FTP). Music or a movie — keep cadence above 85.",
  },
  {
    id: "ss-90",
    name: "Sweet-spot 4×15",
    kind: "sweet-spot",
    durationMin: 90,
    tss: 110,
    description: "15 min warm-up, 4×15 min @ 88–93% FTP with 5 min recovery. 10 min cooldown.",
  },
  {
    id: "int-60",
    name: "Threshold 2×20",
    kind: "intervals",
    durationMin: 60,
    tss: 85,
    description: "15 min warm-up, 2×20 min @ FTP, 8 min easy between. 10 min cooldown.",
  },
  {
    id: "end-120",
    name: "Long Z2",
    kind: "endurance",
    durationMin: 120,
    tss: 110,
    description: "2 hours steady Z2 with 4×30 sec spin-ups every 20 min. Movie-marathon territory.",
  },
];

export function pickWorkouts(intendedMin: number, score: number): Workout[] {
  // Tolerance window — within ±25% of intended duration.
  const lo = intendedMin * 0.75;
  const hi = intendedMin * 1.25;
  const inBand = WORKOUTS.filter((w) => w.durationMin >= lo && w.durationMin <= hi);
  // If score was super low, recommend lower intensity (recovery/endurance first).
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
