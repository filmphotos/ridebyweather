// Derive road-surface advisories from upcoming hourly weather.
// We can't see "the past 6 hours" without a separate history call, so we
// look forward and warn about wet/frost windows you can ride through.

export interface HourCondition {
  timestamp: string | Date;
  tempF: number;
  precipProb: number;
  precipInch?: number;
  humidity: number;
}

export type Advisory =
  | "dry"
  | "wet-now"
  | "wet-soon"
  | "frost-risk"
  | "ice-risk"
  | "drying";

export interface RoadAdvisory {
  level: Advisory;
  label: string;
  color: string;
  message: string;
  wetWindow?: { startIdx: number; endIdx: number };
  frostWindow?: { startIdx: number; endIdx: number };
}

export function advise(hours: HourCondition[]): RoadAdvisory {
  if (hours.length === 0) {
    return { level: "dry", label: "Dry", color: "#22c55e", message: "No forecast available." };
  }

  // Wet detection — any hour over the next 12 with >50% precip prob.
  const wetIdx = hours.slice(0, 12).findIndex(
    (h) => h.precipProb >= 0.5 || (h.precipInch ?? 0) >= 0.04
  );
  // Ice detection — temp at or below 32°F with humidity >= 80% or any precip.
  const iceIdx = hours.slice(0, 12).findIndex(
    (h) => h.tempF <= 32 && (h.humidity >= 80 || h.precipProb >= 0.3)
  );
  // Frost detection — clear-sky cold, between 32 and 38°F, humid.
  const frostIdx = hours.slice(0, 12).findIndex(
    (h) => h.tempF > 32 && h.tempF <= 38 && h.humidity >= 85 && h.precipProb < 0.3
  );

  if (iceIdx !== -1) {
    const endIdx = findEnd(hours, iceIdx, (h) => h.tempF <= 32);
    return {
      level: "ice-risk",
      label: "Ice risk",
      color: "#7c3aed",
      message: `Black ice possible from hour ${iceIdx} to ${endIdx}. Bridges and shaded curves freeze first — consider rescheduling or hitting the trainer.`,
      frostWindow: { startIdx: iceIdx, endIdx },
    };
  }

  const currentlyWet = hours[0].precipProb >= 0.5 || (hours[0].precipInch ?? 0) >= 0.04;
  if (currentlyWet) {
    // How many hours until likely dry? When precip drops <30% AND ~3 dry hours follow.
    const dryStart = hours.findIndex((h, i) => i > 0 && h.precipProb < 0.3);
    const driedAt = dryStart !== -1 ? dryStart + 2 : 12;
    return {
      level: "wet-now",
      label: "Wet now",
      color: "#3b82f6",
      message: `Roads are wet. Expect a drying window starting around hour ${driedAt}. Lower tire pressure ~10% and brake earlier.`,
      wetWindow: { startIdx: 0, endIdx: Math.min(driedAt, hours.length - 1) },
    };
  }

  if (wetIdx !== -1 && wetIdx <= 6) {
    return {
      level: "wet-soon",
      label: "Wet within 6h",
      color: "#0ea5e9",
      message: `Rain expected starting around hour ${wetIdx}. Get out now or wait until things dry — riding into the start of a storm is the wettest scenario.`,
      wetWindow: { startIdx: wetIdx, endIdx: Math.min(wetIdx + 4, hours.length - 1) },
    };
  }

  if (frostIdx !== -1) {
    return {
      level: "frost-risk",
      label: "Frost risk",
      color: "#a855f7",
      message: `Possible frost around hour ${frostIdx}. Watch painted lines, manhole covers, and shaded turns until temps climb above 40°F.`,
      frostWindow: { startIdx: frostIdx, endIdx: Math.min(frostIdx + 2, hours.length - 1) },
    };
  }

  // Drying signal — temp ≥45°F, low humidity, no precip → confidence-builder.
  const drying = hours[0].tempF >= 45 && hours[0].humidity <= 65 && hours[0].precipProb < 0.2;
  if (drying) {
    return {
      level: "drying",
      label: "Dry & drying",
      color: "#22c55e",
      message: "Good surface conditions — dry pavement, normal traction, normal pressure.",
    };
  }

  return {
    level: "dry",
    label: "Dry",
    color: "#22c55e",
    message: "No surface advisories in the next 12 hours.",
  };
}

function findEnd(hours: HourCondition[], startIdx: number, pred: (h: HourCondition) => boolean): number {
  for (let i = startIdx; i < hours.length; i++) {
    if (!pred(hours[i])) return i - 1;
  }
  return hours.length - 1;
}
