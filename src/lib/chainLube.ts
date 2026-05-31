// Pick the right chain lube from a 7-day precip forecast.
// Wet lube: long-lasting in rain, dirty in dry. Dry lube: clean in dry, washes off in rain.
// Ceramic wax: race-day clean & fast but needs reapplication every wet ride.

export type Lube = "wet" | "dry" | "ceramic";

export interface LubeRec {
  pick: Lube;
  label: string;
  reason: string;
  // Days in the next week likely to be wet (>50% precip prob OR >0.05" forecast).
  wetDays: number;
  totalDays: number;
}

export interface DailyPrecip {
  precipProb: number; // 0..1
  precipInch?: number;
}

export function pickLube(daily: DailyPrecip[]): LubeRec {
  const totalDays = daily.length;
  const wetDays = daily.filter(
    (d) => d.precipProb >= 0.5 || (d.precipInch ?? 0) >= 0.05
  ).length;

  if (wetDays >= 3) {
    return {
      pick: "wet",
      label: "Wet lube",
      reason: `${wetDays} of ${totalDays} days look wet. A wet lube clings through rain and grit — re-clean the chain when the sun comes back.`,
      wetDays,
      totalDays,
    };
  }
  if (wetDays === 0) {
    return {
      pick: "ceramic",
      label: "Ceramic wax",
      reason: "Forecast is dry all week. Ceramic wax is the fastest, quietest, cleanest option — perfect window to reapply.",
      wetDays,
      totalDays,
    };
  }
  return {
    pick: "dry",
    label: "Dry lube",
    reason: `${wetDays} wet day${wetDays === 1 ? "" : "s"} in the next ${totalDays} — a dry lube is the safe default. Re-lube after any rain ride.`,
    wetDays,
    totalDays,
  };
}
