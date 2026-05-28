import Link from "next/link";
import Image from "next/image";
import RotatingActivity from "@/components/Hero/RotatingActivity";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-12 pb-20 sm:pt-20 sm:pb-32 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-900/20 via-gray-950 to-gray-950" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 sm:px-4 py-1.5 text-xs sm:text-sm text-sky-400">
            <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
            Cycling MVP — Now Available
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
            <RotatingActivity /> smarter with{" "}
            <span className="bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">
              weather intelligence
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-gray-400 max-w-2xl mx-auto">
            Real-time Ride Scores, wind-aware routing, and gear recommendations — built for
            cyclists and runners who refuse to get caught out.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
            <Link href="/cycling" className="btn-primary text-base px-6 sm:px-8 py-3 sm:py-4">
              Check Today&apos;s Ride Score
            </Link>
            <Link href="/pricing" className="btn-secondary text-base px-6 sm:px-8 py-3 sm:py-4">
              View Pricing
            </Link>
          </div>

          {/* Hero avatar grid */}
          <div className="relative mt-14 max-w-5xl mx-auto">
            <div className="rounded-2xl border border-gray-800 bg-[#f5f0e8] p-3 sm:p-5 shadow-2xl overflow-hidden">
              <Image
                src="/hero-avatars-grid.png"
                alt="Cyclist outfit recommendations for every weather condition — male and female"
                width={1536}
                height={1024}
                priority
                className="w-full h-auto rounded-lg"
              />
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Gear recommendations for every condition — sun, rain, snow, wind, night.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-16 sm:py-24 sm:px-6 lg:px-8 bg-gray-900/50">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-white mb-3">
            Everything in RideByWeather
          </h2>
          <p className="text-center text-gray-400 text-sm sm:text-base mb-8 sm:mb-12 max-w-2xl mx-auto">
            One app for every weather decision — from the Ride Score to air quality, hydration,
            sun safety, and multi-day tour planning.
          </p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) =>
              f.href ? (
                <Link
                  key={f.title}
                  href={f.href}
                  className="card transition-colors hover:border-sky-500/40"
                >
                  <div className="mb-4 text-4xl">{f.icon}</div>
                  <h3 className="text-lg font-semibold text-white">{f.title}</h3>
                  <p className="mt-2 text-gray-400 text-sm">{f.description}</p>
                </Link>
              ) : (
                <div key={f.title} className="card">
                  <div className="mb-4 text-4xl">{f.icon}</div>
                  <h3 className="text-lg font-semibold text-white">{f.title}</h3>
                  <p className="mt-2 text-gray-400 text-sm">{f.description}</p>
                </div>
              )
            )}
          </div>
          <div className="mt-10 text-center">
            <Link href="/features" className="btn-secondary text-base px-6 py-3">
              See all features
            </Link>
          </div>
        </div>
      </section>

      {/* Ride Score explainer */}
      <section className="px-4 py-16 sm:py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">The Ride Score</h2>
          <p className="text-gray-400 mb-8 sm:mb-12 text-sm sm:text-base">
            A single 0–10 number that combines wind, temperature, precipitation, and safety
            factors — updated every hour.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {scoreGuide.map((s) => (
              <div
                key={s.range}
                className="card text-center p-4 sm:p-6"
                style={{ borderColor: `${s.color}33` }}
              >
                <div className="text-xl sm:text-2xl font-bold" style={{ color: s.color }}>
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
    icon: "🌡️",
    title: "Ride Score (0–10)",
    description: "Weighted algorithm combining wind, temperature, precipitation, gusts, and humidity into one actionable number.",
    href: "/ride-score",
  },
  {
    icon: "🌬️",
    title: "Wind-Aware Routing",
    description: "See headwind/tailwind percentages per route segment. Auto reverse suggestion when wind direction changes.",
    href: "/routes",
  },
  {
    icon: "👕",
    title: "Gear Recommendations",
    description: "Weather-based avatar shows exactly what to wear — from base layers to rain jackets.",
    href: "/gear",
  },
  {
    icon: "📡",
    title: "Hourly Forecasts",
    description: "Plan your ride window across the next 48 hours with a color-coded Ride Score timeline.",
    href: "/forecast",
  },
  {
    icon: "🚲",
    title: "Bike Type Profiles",
    description: "Road, gravel, MTB, commuter, or e-bike — the Ride Score retunes to the bike you're riding today.",
    href: "/bike-profiles",
  },
  {
    icon: "🏃",
    title: "Multi-Sport",
    description: "Cycling, running, and walking each get their own dashboard, tuned to the weather that matters for that sport.",
    href: "/running",
  },
  {
    icon: "🌫️",
    title: "Air Quality",
    description: "Live US AQI with PM2.5, ozone, and NO₂ — plus wildfire-smoke and sensitive-group warnings before you head out.",
    href: "/air-quality",
  },
  {
    icon: "☀️",
    title: "UV & Sun Safety",
    description: "Hourly UV index with sunscreen, sleeve, and eyewear prompts when the burn potential spikes.",
    href: "/sun",
  },
  {
    icon: "🌅",
    title: "Sunrise / Sunset Planner",
    description: "Exact daylight and civil-twilight windows, golden hour, and a lights-required reminder for dawn and dusk rides.",
    href: "/sun",
  },
  {
    icon: "💧",
    title: "Hydration Coach",
    description: "Heat index, wet-bulb risk, and humidity-adjusted bottle and electrolyte targets for your planned effort.",
    href: "/hydration",
  },
  {
    icon: "🗓️",
    title: "Multi-Day Tour Planner",
    description: "See a full week of Ride Scores across your route and pack gear for the worst day of the trip.",
    href: "/tour",
  },
  {
    icon: "⚖️",
    title: "Compare Locations",
    description: "Side-by-side Ride Scores for any two cities. Settle the “is it nicer at the coast today” debate in seconds.",
    href: "/compare",
  },
  {
    icon: "👥",
    title: "Group Rides",
    description: "Create or join scheduled rides with a shared Ride Score, RSVP roster, and one-tap calendar export.",
    href: "/group-rides",
  },
  {
    icon: "🆘",
    title: "Emergency & Medical",
    description: "Find the nearest urgent care, hospital, or pharmacy from your current location when a ride goes sideways.",
    href: "/hospitals",
  },
  {
    icon: "🔥",
    title: "Heat Acclimation",
    description: "Track your heat adaptation over a training block so the Ride Score knows how well you handle the heat.",
    href: "/acclimation",
  },
  {
    icon: "📜",
    title: "E-Bike Law Reference",
    description: "State-by-state guide to US e-bike classes, helmet rules, age minimums, and where each class can ride.",
    href: "/ebike-laws",
  },
  {
    icon: "🎬",
    title: "Live Ride Mode",
    description: "A wake-locked ride screen with current conditions, next-hour outlook, and mid-ride wind-shift alerts.",
    href: "/ride",
  },
  {
    icon: "⌚",
    title: "Garmin & Wahoo Sync",
    description: "Push weather alerts to your head unit and Wear OS watch. (Garmin & Wahoo push alerts coming soon)",
  },
];

const scoreGuide = [
  { range: "8–10", label: "Great",     color: "#22c55e", desc: "Go ride now" },
  { range: "5–7",  label: "Good",      color: "#eab308", desc: "Manageable" },
  { range: "3–4",  label: "Tough",     color: "#f97316", desc: "Prepare well" },
  { range: "0–2",  label: "Dangerous", color: "#ef4444", desc: "Stay home" },
];
