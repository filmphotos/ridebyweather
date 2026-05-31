"use client";

import Link from "next/link";

interface Weather {
  tempF: number;
  feelsLikeF: number;
  humidity: number;
  windSpeedMph: number;
  windGustMph: number;
  precipProb: number;
  condition: string;
}

interface Suggestion {
  href: string;
  icon: string;
  title: string;
  reason: string;
  rank: number; // higher = more relevant
}

interface Props {
  score: number;
  weather: Weather;
}

// Picks the 3 most relevant feature pages for the current weather + score.
// Pure ranking — keeps the dashboard reactive without an extra fetch.
export default function UsefulNow({ score, weather }: Props) {
  const picks = pickSuggestions(score, weather).slice(0, 3);
  if (picks.length === 0) return null;

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Useful right now</h2>
        <Link href="/features" className="text-xs text-sky-400 hover:text-sky-300">All tools →</Link>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {picks.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="flex items-start gap-3 rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2.5 transition-colors hover:border-sky-500/40 hover:bg-gray-900/70"
          >
            <span className="text-2xl shrink-0">{p.icon}</span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">{p.title}</div>
              <div className="text-xs text-gray-400 leading-tight mt-0.5">{p.reason}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function pickSuggestions(score: number, w: Weather): Suggestion[] {
  const out: Suggestion[] = [];

  if (w.condition === "thunderstorm") {
    out.push({ href: "/lightning", icon: "⚡", title: "Lightning map", reason: "Storm in the forecast — check the 30-30 rule.", rank: 100 });
  }
  if (w.precipProb >= 0.3 || w.condition === "rain") {
    out.push({ href: "/road-conditions", icon: "🛣️", title: "Road conditions", reason: "Wet pavement window + grip advisory.", rank: 90 });
    out.push({ href: "/chain-lube", icon: "⛓️", title: "Chain lube", reason: "Wet week — pick the right lube.", rank: 70 });
  }
  if (w.tempF <= 38) {
    out.push({ href: "/road-conditions", icon: "❄️", title: "Frost & ice risk", reason: "Cold roads — black ice possible.", rank: 88 });
  }
  if (score < 5) {
    out.push({ href: "/indoor", icon: "🏠", title: "Indoor fallback", reason: "Low score outside — match a trainer workout.", rank: 85 });
  }
  if (w.windSpeedMph >= 15 || w.windGustMph >= 20) {
    out.push({ href: "/family", icon: "👨‍👩‍👧", title: "Family mode check", reason: "Gusty — verdict for trailer/kid riding.", rank: 60 });
  }
  if (w.tempF >= 85 || w.humidity >= 80) {
    out.push({ href: "/asthma", icon: "🫁", title: "Sensitive lungs", reason: "Hot/humid air — asthma-aware verdict.", rank: 75 });
    out.push({ href: "/hydration", icon: "💧", title: "Hydration plan", reason: "Heat index high — sodium target.", rank: 72 });
  }
  if (w.tempF >= 70 && w.precipProb < 0.2) {
    out.push({ href: "/pollen", icon: "🌼", title: "Pollen index", reason: "Allergy season conditions.", rank: 55 });
  }

  // Always-relevant habit + Pro hooks.
  out.push({ href: "/commute", icon: "🚲", title: "Commute mode", reason: "AM + PM forecasts side by side.", rank: 50 });
  out.push({ href: "/briefing", icon: "🎙️", title: "Morning briefing", reason: "20-second spoken summary.", rank: 45 });
  out.push({ href: "/tire-pressure", icon: "🛞", title: "Tire pressure", reason: "Front/rear PSI for the surface.", rank: 40 });
  out.push({ href: "/event", icon: "🗓️", title: "Event countdown", reason: "Pin a race day to watch the forecast.", rank: 35 });
  out.push({ href: "/maintenance", icon: "🔧", title: "Service intervals", reason: "Track miles since last drivetrain service.", rank: 30 });

  // Dedupe by href, keep highest rank.
  const byHref = new Map<string, Suggestion>();
  for (const s of out) {
    const existing = byHref.get(s.href);
    if (!existing || existing.rank < s.rank) byHref.set(s.href, s);
  }
  return Array.from(byHref.values()).sort((a, b) => b.rank - a.rank);
}
