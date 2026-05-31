import type { Metadata } from "next";
import Link from "next/link";
import { CITY_GUIDES } from "@/lib/routeGuides";

export const metadata: Metadata = {
  title: "City Ride Guides — RideByWeather",
  description: "Curated city ride guides: best loops, wind patterns, and season-by-season advice.",
};

export default function GuidesIndexPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">City Ride Guides</h1>
        <p className="mt-3 text-gray-400 max-w-2xl">
          Hand-curated guides to the best rides in each city — including how the prevailing wind
          and seasonal weather should shape your route choice.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CITY_GUIDES.map((g) => (
          <Link
            key={g.slug}
            href={`/guides/${g.slug}`}
            className="card flex flex-col transition-colors hover:border-sky-500/40"
          >
            <div className="text-xs uppercase tracking-wide text-gray-500">{g.state}</div>
            <h2 className="text-2xl font-bold text-white mt-1">{g.city}</h2>
            <p className="mt-3 text-sm text-gray-400 flex-1">{g.intro}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-sky-400">
              Open guide
              <span aria-hidden>→</span>
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-10 text-xs text-gray-500 text-center">
        Want your city covered? Email <a href="mailto:guides@ridebyweather.com" className="text-sky-400">guides@ridebyweather.com</a>.
      </p>
    </div>
  );
}
