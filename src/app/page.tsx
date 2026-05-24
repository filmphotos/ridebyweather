import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-20 pb-32 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-900/20 via-gray-950 to-gray-950" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-sm text-sky-400">
            <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
            Cycling MVP — Now Available
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
            Ride smarter with{" "}
            <span className="bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">
              weather intelligence
            </span>
          </h1>

          <p className="mt-6 text-xl text-gray-400 max-w-2xl mx-auto">
            Real-time Ride Scores, wind-aware routing, and gear recommendations — built for
            cyclists who refuse to get caught out.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/cycling" className="btn-primary text-base px-8 py-4">
              Check Today&apos;s Ride Score
            </Link>
            <Link href="/pricing" className="btn-secondary text-base px-8 py-4">
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-24 sm:px-6 lg:px-8 bg-gray-900/50">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-3xl font-bold text-white mb-12">
            Everything a cyclist needs to decide
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="card">
                <div className="mb-4 text-4xl">{f.icon}</div>
                <h3 className="text-lg font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-gray-400 text-sm">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ride Score explainer */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-white mb-4">The Ride Score</h2>
          <p className="text-gray-400 mb-12">
            A single 0–10 number that combines wind, temperature, precipitation, and safety
            factors — updated every hour.
          </p>
          <div className="grid grid-cols-4 gap-3">
            {scoreGuide.map((s) => (
              <div
                key={s.range}
                className="card text-center"
                style={{ borderColor: `${s.color}33` }}
              >
                <div className="text-2xl font-bold" style={{ color: s.color }}>
                  {s.range}
                </div>
                <div className="mt-1 text-xs font-semibold tracking-wide uppercase" style={{ color: s.color }}>
                  {s.label}
                </div>
                <div className="mt-2 text-xs text-gray-500">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

const features = [
  {
    icon: "🌬️",
    title: "Wind-Aware Routing",
    description: "See headwind/tailwind percentages per route segment. Auto reverse suggestion when wind direction changes.",
  },
  {
    icon: "🌡️",
    title: "Ride Score (0–10)",
    description: "Weighted algorithm combining wind, temperature, precipitation, gusts, and humidity into one actionable number.",
  },
  {
    icon: "👕",
    title: "Gear Recommendations",
    description: "Weather-based avatar shows exactly what to wear — from base layers to rain jackets.",
  },
  {
    icon: "🗺️",
    title: "Elevation Charting",
    description: "Gradient and elevation profiles with per-segment wind analysis for serious route planning.",
  },
  {
    icon: "📡",
    title: "Hourly Forecasts",
    description: "Plan your ride window across the next 48 hours with color-coded Ride Score timeline.",
  },
  {
    icon: "⌚",
    title: "Garmin & Strava Sync",
    description: "Push weather alerts to your head unit. Sync ride history from Strava and Wahoo.",
  },
];

const scoreGuide = [
  { range: "8–10", label: "Great",     color: "#22c55e", desc: "Go ride now" },
  { range: "5–7",  label: "Good",      color: "#eab308", desc: "Manageable" },
  { range: "3–4",  label: "Tough",     color: "#f97316", desc: "Prepare well" },
  { range: "0–2",  label: "Dangerous", color: "#ef4444", desc: "Stay home" },
];
