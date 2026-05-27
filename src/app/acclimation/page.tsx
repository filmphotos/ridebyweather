import type { Metadata } from "next";
import Link from "next/link";
import {
  HEAT_PROTOCOL,
  COLD_PROTOCOL,
  HEAT_ADAPTATIONS,
  COLD_ADAPTATIONS,
  HEAT_WARNINGS,
  COLD_WARNINGS,
  SPORT_TIPS,
  QUICK_FACTS,
  type WarningSign,
  type AcclimationDay,
  type AdaptationMarker,
} from "@/lib/acclimation";

export const metadata: Metadata = {
  title: "Heat & Cold Acclimation for Cyclists and Runners — RideByWeather",
  description:
    "Science-backed protocols for adapting your body to heat and cold. 10–14 day heat acclimation plan, cold habituation routine, warning signs, and sport-specific tips for cyclists and runners.",
};

function severityStyle(severity: WarningSign["severity"]) {
  switch (severity) {
    case "watch":
      return {
        border: "border-yellow-500/30",
        bg: "bg-yellow-500/5",
        text: "text-yellow-400",
        label: "Watch",
      };
    case "stop":
      return {
        border: "border-orange-500/30",
        bg: "bg-orange-500/5",
        text: "text-orange-400",
        label: "Stop training",
      };
    case "emergency":
      return {
        border: "border-red-500/40",
        bg: "bg-red-500/10",
        text: "text-red-400",
        label: "Emergency",
      };
  }
}

function ProtocolTable({ days, accent }: { days: AcclimationDay[]; accent: "orange" | "sky" }) {
  const accentBg = accent === "orange" ? "bg-orange-500/10 border-orange-500/20 text-orange-400" : "bg-sky-500/10 border-sky-500/20 text-sky-400";
  return (
    <div className="space-y-2">
      {days.map((d) => (
        <details
          key={d.day}
          className="group rounded-xl border border-gray-800 bg-gray-900/40 hover:bg-gray-900/70 transition-colors"
        >
          <summary className="cursor-pointer list-none px-4 py-3 sm:px-5 sm:py-4 flex items-center gap-3 sm:gap-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${accentBg}`}>
              D{d.day}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold truncate">{d.duration}</div>
              <div className="text-xs text-gray-500 mt-0.5 truncate">{d.intensity}</div>
            </div>
            <svg className="h-5 w-5 text-gray-500 shrink-0 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </summary>
          <div className="border-t border-gray-800 px-4 py-3 sm:px-5 sm:py-4 text-sm text-gray-300">
            {d.notes}
          </div>
        </details>
      ))}
    </div>
  );
}

function AdaptationList({ items, accent }: { items: AdaptationMarker[]; accent: "orange" | "sky" }) {
  const dot = accent === "orange" ? "bg-orange-400" : "bg-sky-400";
  const label = accent === "orange" ? "text-orange-400" : "text-sky-400";
  return (
    <ul className="space-y-4">
      {items.map((m) => (
        <li key={m.marker} className="flex gap-3">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
          <div className="flex-1">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-white font-semibold text-sm">{m.marker}</span>
              <span className={`text-xs font-medium ${label}`}>{m.timeframe}</span>
            </div>
            <p className="mt-1 text-sm text-gray-400">{m.what}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function WarningList({ items }: { items: WarningSign[] }) {
  return (
    <div className="space-y-3">
      {items.map((w) => {
        const s = severityStyle(w.severity);
        return (
          <div key={w.condition} className={`rounded-xl border p-4 sm:p-5 ${s.border} ${s.bg}`}>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <h3 className="text-white font-semibold">{w.condition}</h3>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide border ${s.border} ${s.text} bg-gray-950/40`}>
                {s.label}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">Signs</div>
                <ul className="space-y-1">
                  {w.signs.map((sign) => (
                    <li key={sign} className="text-sm text-gray-300 flex gap-2">
                      <span className="text-gray-600">•</span>
                      <span>{sign}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">Action</div>
                <p className="text-sm text-gray-300">{w.action}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SportTipCard({
  sport,
  environment,
  tips,
}: {
  sport: "cycling" | "running";
  environment: "heat" | "cold";
  tips: string[];
}) {
  const icon = sport === "cycling" ? "🚴" : "🏃";
  const heading = `${sport === "cycling" ? "Cycling" : "Running"} in the ${environment}`;
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{icon}</span>
        <h3 className="text-white font-semibold">{heading}</h3>
      </div>
      <ul className="space-y-2">
        {tips.map((t) => (
          <li key={t} className="text-sm text-gray-300 flex gap-2">
            <span className="text-sky-500 mt-0.5">›</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AcclimationPage() {
  const heatCycling = SPORT_TIPS.find((t) => t.sport === "cycling" && t.environment === "heat")!;
  const coldCycling = SPORT_TIPS.find((t) => t.sport === "cycling" && t.environment === "cold")!;
  const heatRunning = SPORT_TIPS.find((t) => t.sport === "running" && t.environment === "heat")!;
  const coldRunning = SPORT_TIPS.find((t) => t.sport === "running" && t.environment === "cold")!;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Heat & Cold Acclimation
        </h1>
        <p className="mt-3 text-gray-400 max-w-3xl text-sm sm:text-base">
          How cyclists and runners can train their body to handle extreme temperatures.
          Two- to three-week protocols, the physiological adaptations to expect, warning
          signs that mean stop, and sport-specific tactics for the road and trail.
        </p>
        <p className="mt-2 text-xs text-amber-400/80 italic">
          Educational only — not medical advice. Talk to a clinician before starting if you
          have cardiovascular, respiratory, or other underlying conditions.
        </p>
      </div>

      {/* Quick stats */}
      <div className="mb-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {QUICK_FACTS.map((f) => (
          <div key={f.label} className="card text-center">
            <div className="text-2xl font-bold" style={{ color: f.color }}>{f.value}</div>
            <div className="text-xs text-gray-500 mt-1">{f.label}</div>
          </div>
        ))}
      </div>

      {/* The two environments at a glance */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4">Two very different problems</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card border-orange-500/20">
            <div className="text-xs font-bold uppercase tracking-wider text-orange-400 mb-2">Heat acclimation</div>
            <div className="text-white font-semibold mb-2">Train the cooling system</div>
            <p className="text-sm text-gray-400">
              The body has a well-studied set of adaptations to repeated heat stress: expanded
              plasma volume, earlier and more dilute sweat, and a lower resting core
              temperature. Most are functional in 10–14 days and produce meaningful
              performance gains in any event held above ~22°C / 72°F.
            </p>
          </div>
          <div className="card border-sky-500/20">
            <div className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-2">Cold habituation</div>
            <div className="text-white font-semibold mb-2">Train the response, not the furnace</div>
            <p className="text-sm text-gray-400">
              The body adapts less dramatically to cold than to heat. What you mostly gain is
              a blunted cold-shock response (no panic gasp on cold-water entry), better
              vasoconstriction control, and — most importantly — practiced gear, breathing,
              and pacing habits.
            </p>
          </div>
        </div>
      </section>

      {/* Heat protocol */}
      <section id="heat" className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🌡️</span>
          <h2 className="text-xl font-bold text-white">10–14 Day Heat Acclimation Protocol</h2>
        </div>
        <p className="text-sm text-gray-400 mb-5 max-w-3xl">
          Train in the heat — outdoors, a garage with no fan, or a controlled hot room. Each
          session should raise core temperature ~1°C and last at least 30 min. Start
          conservatively; the first 3 days will feel disproportionately hard.
        </p>
        <ProtocolTable days={HEAT_PROTOCOL} accent="orange" />
      </section>

      {/* Heat adaptations */}
      <section className="mb-12 rounded-xl border border-orange-500/20 bg-orange-500/[0.03] p-5 sm:p-6">
        <h2 className="text-lg font-bold text-white mb-4">What's actually adapting</h2>
        <AdaptationList items={HEAT_ADAPTATIONS} accent="orange" />
      </section>

      {/* Heat warnings */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-white mb-4">Heat illness — recognize and respond</h2>
        <p className="text-sm text-gray-400 mb-5 max-w-3xl">
          Heat illness is a spectrum. Cramps are a warning; exhaustion is a stop signal;
          heat stroke is life-threatening and minutes matter. Acclimation reduces — but does
          not eliminate — the risk.
        </p>
        <WarningList items={HEAT_WARNINGS} />
      </section>

      {/* Cold protocol */}
      <section id="cold" className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">❄️</span>
          <h2 className="text-xl font-bold text-white">Cold Habituation Protocol</h2>
        </div>
        <p className="text-sm text-gray-400 mb-5 max-w-3xl">
          A staged plan blending cold showers, deliberately under-dressed outdoor sessions,
          and optional cold-water immersion. The goal is calm breathing on first cold
          exposure and confidence with layering — not endurance suffering.
        </p>
        <ProtocolTable days={COLD_PROTOCOL} accent="sky" />
      </section>

      {/* Cold adaptations */}
      <section className="mb-12 rounded-xl border border-sky-500/20 bg-sky-500/[0.03] p-5 sm:p-6">
        <h2 className="text-lg font-bold text-white mb-4">What you'll notice</h2>
        <AdaptationList items={COLD_ADAPTATIONS} accent="sky" />
      </section>

      {/* Cold warnings */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-white mb-4">Cold injuries — recognize and respond</h2>
        <p className="text-sm text-gray-400 mb-5 max-w-3xl">
          The danger curve in the cold is sneakier than in the heat — by the time you stop
          shivering, you may already be in trouble. Train with a buddy below freezing
          whenever possible.
        </p>
        <WarningList items={COLD_WARNINGS} />
      </section>

      {/* Sport-specific tips */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-white mb-4">Sport-specific tactics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SportTipCard sport="cycling" environment="heat" tips={heatCycling.tips} />
          <SportTipCard sport="running" environment="heat" tips={heatRunning.tips} />
          <SportTipCard sport="cycling" environment="cold" tips={coldCycling.tips} />
          <SportTipCard sport="running" environment="cold" tips={coldRunning.tips} />
        </div>
      </section>

      {/* Maintenance */}
      <section className="mb-12 rounded-xl border border-gray-800 bg-gray-900/40 p-5 sm:p-6">
        <h2 className="text-lg font-bold text-white mb-2">Keeping the adaptation</h2>
        <p className="text-sm text-gray-400">
          Heat adaptation decays roughly 2.5% per day without re-exposure — you lose most of
          it in 3–4 weeks. One hot session every 3–5 days preserves the majority of benefits.
          Cold habituation persists slightly longer; aim for 2–3 cold exposures per week to
          hold the blunted shock response. Don't try to acclimate in race week — the heat
          stress itself is fatiguing. Finish your build at least 7 days out.
        </p>
      </section>

      {/* Footer CTA */}
      <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-6 text-center">
        <h2 className="text-lg font-bold text-white mb-2">Time your workouts to the weather</h2>
        <p className="text-sm text-gray-400 mb-4">
          Use the Ride Score to plan your acclimation sessions — and your easy days.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/cycling" className="btn-primary text-sm px-5 py-2.5 inline-block">
            Cycling Dashboard
          </Link>
          <Link href="/running" className="btn-secondary text-sm px-5 py-2.5 inline-block">
            Running Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
