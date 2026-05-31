// Caffeine timing for cyclists. Onset is fast (~15 min) but peak plasma is
// ~45-60 min after consumption. Performance benefit window stays ~60-90 min
// past peak. Half-life is ~5h in healthy adults.

export type Source = "espresso" | "coffee" | "energy-gel" | "pre-workout" | "tea";

export interface SourceInfo {
  id: Source;
  label: string;
  emoji: string;
  mg: number;
  description: string;
}

export const SOURCES: SourceInfo[] = [
  { id: "espresso", label: "Espresso (single)", emoji: "☕", mg: 75, description: "Compact, fast — good for short hard efforts." },
  { id: "coffee", label: "Cup of coffee (8 oz)", emoji: "🥤", mg: 95, description: "The default for most riders." },
  { id: "energy-gel", label: "Caffeinated gel", emoji: "🫧", mg: 50, description: "Mid-ride boost — onset is fastest with empty stomach." },
  { id: "pre-workout", label: "Pre-workout scoop", emoji: "⚡", mg: 200, description: "Big hit — save for race day, not the daily ride." },
  { id: "tea", label: "Black tea (8 oz)", emoji: "🍵", mg: 47, description: "Gentler curve, longer onset." },
];

// Recommended dose: 3-6 mg per kg of bodyweight, well-tolerated and effective.
export function recommendedDoseRangeMg(weightLb: number): { lo: number; hi: number } {
  const kg = weightLb / 2.205;
  return { lo: Math.round(3 * kg), hi: Math.round(6 * kg) };
}

export interface TimingPlan {
  // When to consume, in minutes BEFORE ride start (positive = ahead of time).
  intakeMinBeforeRide: number;
  // Clock time string (HH:mm) for the intake.
  intakeClockTime: string;
  // Optional second dose for long rides.
  secondDoseMinAfterStart?: number;
  secondDoseClockTime?: string;
  // Total mg vs the recommended range.
  totalMg: number;
  doseStatus: "low" | "in-range" | "high" | "very-high";
  doseNote: string;
  // Plain-English summary.
  advice: string;
}

export function plan({
  rideStartClockTime, // "HH:mm"
  durationMin,
  sourceQuantity, // count of each source consumed pre-ride
  sources,
  weightLb,
}: {
  rideStartClockTime: string;
  durationMin: number;
  sourceQuantity: Record<Source, number>;
  sources: SourceInfo[];
  weightLb: number;
}): TimingPlan {
  // Peak performance is ~45-60 min after intake → take 45 min before ride.
  const intakeMinBeforeRide = 45;
  const intakeClock = shiftClock(rideStartClockTime, -intakeMinBeforeRide);

  const totalMg = sources.reduce((sum, s) => sum + s.mg * (sourceQuantity[s.id] || 0), 0);
  const range = recommendedDoseRangeMg(weightLb);
  let doseStatus: TimingPlan["doseStatus"] = "in-range";
  let doseNote = `In range: ${range.lo}–${range.hi} mg for your weight.`;
  if (totalMg < range.lo * 0.6) {
    doseStatus = "low";
    doseNote = `Below the effective dose for your weight (${range.lo}–${range.hi} mg). Add more for a measurable benefit.`;
  } else if (totalMg > range.hi * 1.25) {
    doseStatus = "very-high";
    doseNote = `Past the comfortable range (${range.lo}–${range.hi} mg). Jitters, GI distress, and disturbed sleep get likely above ~${range.hi}mg.`;
  } else if (totalMg > range.hi) {
    doseStatus = "high";
    doseNote = `A bit over the comfort range (${range.lo}–${range.hi} mg). Fine for one event, not a daily target.`;
  }

  let secondDoseMin: number | undefined;
  let secondDoseClock: string | undefined;
  if (durationMin >= 120) {
    // Top up at peak-decay point — around 2h after intake.
    secondDoseMin = Math.round(durationMin / 2);
    secondDoseClock = shiftClock(rideStartClockTime, secondDoseMin);
  }

  let advice = `Drink your caffeine ${intakeMinBeforeRide} min before you ride. Peak plasma hits around the start.`;
  if (durationMin >= 120) {
    advice += ` For a ${Math.round(durationMin / 60)}h ride, top up with a caffeinated gel around halfway.`;
  }
  if (doseStatus === "low") advice += " You're underdosing — bump it up if you're chasing the benefit.";
  if (doseStatus === "very-high") advice += " Dial it back next time.";

  return {
    intakeMinBeforeRide,
    intakeClockTime: intakeClock,
    secondDoseMinAfterStart: secondDoseMin,
    secondDoseClockTime: secondDoseClock,
    totalMg,
    doseStatus,
    doseNote,
    advice,
  };
}

function shiftClock(hhmm: string, deltaMin: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  let total = h * 60 + m + deltaMin;
  total = ((total % 1440) + 1440) % 1440;
  const oh = Math.floor(total / 60);
  const om = total % 60;
  return `${String(oh).padStart(2, "0")}:${String(om).padStart(2, "0")}`;
}
