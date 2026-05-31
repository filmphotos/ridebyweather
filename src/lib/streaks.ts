// Local-first ride streak + achievement engine. Stored in localStorage for v1;
// a DB-backed version with social comparison can swap in later.

export interface LoggedRide {
  id: string;
  dateIso: string;    // YYYY-MM-DD (local date — not a Date object)
  durationMin: number;
  tempF: number;
  precipProb: number; // 0..1 at time of log
  windSpeedMph: number;
  isDawn: boolean;    // started before sunrise + 1h
  isDusk: boolean;    // started within 1h of sunset or later
  notes?: string;
}

export interface Streak {
  currentDays: number;
  longestDays: number;
  lastRideDate: string | null;
  totalRides: number;
}

export function computeStreak(rides: LoggedRide[], today: Date = new Date()): Streak {
  if (rides.length === 0) {
    return { currentDays: 0, longestDays: 0, lastRideDate: null, totalRides: 0 };
  }
  // Unique ride dates sorted descending.
  const dates = Array.from(new Set(rides.map((r) => r.dateIso))).sort((a, b) => (a < b ? 1 : -1));
  const todayStr = isoDate(today);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = isoDate(yesterday);

  // Current streak — break unless latest ride is today or yesterday.
  let current = 0;
  if (dates[0] === todayStr || dates[0] === yesterdayStr) {
    current = 1;
    let cursor = dates[0];
    for (let i = 1; i < dates.length; i++) {
      const prev = isoDate(addDays(parseIso(cursor), -1));
      if (dates[i] === prev) {
        current++;
        cursor = dates[i];
      } else {
        break;
      }
    }
  }

  // Longest streak — scan all dates ascending.
  let longest = 0;
  let run = 1;
  const asc = dates.slice().reverse();
  for (let i = 1; i < asc.length; i++) {
    const prev = isoDate(addDays(parseIso(asc[i]), -1));
    if (asc[i - 1] === prev) {
      run++;
    } else {
      longest = Math.max(longest, run);
      run = 1;
    }
  }
  longest = Math.max(longest, run);
  if (current > longest) longest = current;

  return {
    currentDays: current,
    longestDays: longest,
    lastRideDate: dates[0],
    totalRides: rides.length,
  };
}

export type AchievementId =
  | "first-ride"
  | "five-rides"
  | "twenty-rides"
  | "fifty-rides"
  | "century-rides"
  | "weeklong-streak"
  | "monthlong-streak"
  | "first-cold"
  | "deep-cold"
  | "first-rain"
  | "monsoon"
  | "dawn-patrol"
  | "dusk-rider"
  | "windy-day"
  | "gale-warrior"
  | "long-ride";

export interface Achievement {
  id: AchievementId;
  label: string;
  emoji: string;
  description: string;
  earned: boolean;
  progress?: { have: number; need: number };
}

export function evaluateAchievements(rides: LoggedRide[], streak: Streak): Achievement[] {
  const coldRides = rides.filter((r) => r.tempF <= 40).length;
  const deepCold = rides.some((r) => r.tempF <= 25);
  const rainRides = rides.filter((r) => r.precipProb >= 0.5).length;
  const monsoon = rainRides >= 10;
  const dawnRides = rides.some((r) => r.isDawn);
  const duskRides = rides.some((r) => r.isDusk);
  const windyDay = rides.some((r) => r.windSpeedMph >= 18);
  const gale = rides.some((r) => r.windSpeedMph >= 28);
  const longRide = rides.some((r) => r.durationMin >= 240);

  return [
    countAch("first-ride", "First ride", "🚴", "Log your first ride.", rides.length, 1),
    countAch("five-rides", "Five rides", "🖐️", "Log five rides.", rides.length, 5),
    countAch("twenty-rides", "Twenty rides", "📈", "Twenty rides logged.", rides.length, 20),
    countAch("fifty-rides", "Fifty rides", "💪", "Fifty rides logged.", rides.length, 50),
    countAch("century-rides", "Century club", "🏆", "One hundred rides logged.", rides.length, 100),
    countAch("weeklong-streak", "Week-long streak", "🔥", "Seven days of riding in a row.", streak.longestDays, 7),
    countAch("monthlong-streak", "Month-long streak", "🌋", "Thirty days of riding in a row.", streak.longestDays, 30),
    countAch("first-cold", "Cold-pro", "🥶", "Ride in 40°F or colder.", coldRides, 1),
    boolAch("deep-cold", "Deep-freeze rider", "❄️", "Ride in 25°F or colder.", deepCold),
    countAch("first-rain", "Wet-pro", "💧", "Ride with rain in the forecast.", rainRides, 1),
    boolAch("monsoon", "Monsoon rider", "🌧️", "Ten rainy rides logged.", monsoon),
    boolAch("dawn-patrol", "Dawn patrol", "🌅", "Start a ride within an hour of sunrise.", dawnRides),
    boolAch("dusk-rider", "Dusk rider", "🌇", "Start a ride near or after sunset.", duskRides),
    boolAch("windy-day", "Windy-day rider", "🌬️", "Ride with 18+ mph sustained wind.", windyDay),
    boolAch("gale-warrior", "Gale warrior", "💨", "Ride with 28+ mph wind.", gale),
    boolAch("long-ride", "Four-hour ride", "🎯", "Log a ride of four hours or more.", longRide),
  ];
}

function countAch(id: AchievementId, label: string, emoji: string, description: string, have: number, need: number): Achievement {
  return { id, label, emoji, description, earned: have >= need, progress: { have, need } };
}

function boolAch(id: AchievementId, label: string, emoji: string, description: string, earned: boolean): Achievement {
  return { id, label, emoji, description, earned };
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIso(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}
