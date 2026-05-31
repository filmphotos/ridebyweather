import type { Metadata } from "next";
import Link from "next/link";
import {
  EBIKE_LAWS,
  FEDERAL_LAND_SUMMARY,
  SOURCE_LINKS,
  LAWS_LAST_REVIEWED,
  type StateEbikeLaw,
} from "@/lib/ebikeLaws";

export const metadata: Metadata = {
  title: "E-Bike Laws by State — RideByWeather",
  description:
    "State-by-state guide to US e-bike laws, classifications, helmet rules, and trail restrictions. Find where Class 1, 2, and 3 e-bikes are allowed or banned.",
};

function pathBadge(access: StateEbikeLaw["bikePathAccess"]) {
  switch (access) {
    case "allowed":
      return { text: "Allowed", color: "bg-green-500/15 text-green-400 border-green-500/30" };
    case "class1Only":
      return { text: "Class 1 only", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" };
    case "localOption":
      return { text: "Local option", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" };
    case "restricted":
      return { text: "Restricted", color: "bg-red-500/15 text-red-400 border-red-500/30" };
  }
}

function class3Badge(access: StateEbikeLaw["class3PathAccess"]) {
  switch (access) {
    case "allowed":
      return { text: "Paths OK", color: "bg-green-500/15 text-green-400 border-green-500/30" };
    case "roadwayOnly":
      return { text: "Roads only", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" };
    case "localOption":
      return { text: "Local option", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" };
  }
}

export default function EbikeLawsPage() {
  const bannedStates = EBIKE_LAWS.filter((s) => s.hasBan);
  const adoptedStates = EBIKE_LAWS.filter((s) => s.threeClassSystem).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          E-Bike Laws by State
        </h1>
        <p className="mt-3 text-gray-400 max-w-3xl text-sm sm:text-base">
          A reference guide to US state e-bike regulations — classifications, helmet rules,
          minimum age, and where each class can ride. Always verify with local authorities
          before traveling: cities, parks, and HOAs frequently impose stricter rules.
        </p>
        <p className="mt-2 text-xs text-amber-400/80 italic">
          Informational only — not legal advice. Dataset last reviewed {LAWS_LAST_REVIEWED}. For
          authoritative law: see the{" "}
          <a
            href={SOURCE_LINKS.peopleForBikesGuide}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 underline hover:text-sky-300 not-italic"
          >
            PeopleForBikes state guide
          </a>{" "}
          and the{" "}
          <a
            href={SOURCE_LINKS.ncslTracker}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 underline hover:text-sky-300 not-italic"
          >
            NCSL legislation tracker
          </a>
          . See something wrong?{" "}
          <a
            href="mailto:corrections@ridebyweather.com?subject=E-bike%20laws%20correction"
            className="text-sky-400 underline hover:text-sky-300 not-italic"
          >
            Report a correction
          </a>
          .
        </p>
      </div>

      {/* Quick stats */}
      <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card text-center">
          <div className="text-2xl font-bold text-sky-400">{adoptedStates}</div>
          <div className="text-xs text-gray-500 mt-1">States with 3-class system</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-red-400">{bannedStates.length}</div>
          <div className="text-xs text-gray-500 mt-1">States with notable restrictions</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-400">28</div>
          <div className="text-xs text-gray-500 mt-1">Max mph (Class 3)</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-400">750W</div>
          <div className="text-xs text-gray-500 mt-1">Federal max motor</div>
        </div>
      </div>

      {/* Class definitions */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4">The 3-Class System</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <div className="text-xs font-bold uppercase tracking-wider text-green-400 mb-2">Class 1</div>
            <div className="text-white font-semibold mb-1">Pedal-assist · 20 mph</div>
            <p className="text-sm text-gray-400">
              Motor only engages while pedaling. Cuts out at 20 mph. Almost universally
              allowed wherever traditional bicycles are.
            </p>
          </div>
          <div className="card">
            <div className="text-xs font-bold uppercase tracking-wider text-yellow-400 mb-2">Class 2</div>
            <div className="text-white font-semibold mb-1">Throttle · 20 mph</div>
            <p className="text-sm text-gray-400">
              Throttle can propel without pedaling. Cuts out at 20 mph. Allowed on most
              bike infrastructure but increasingly restricted on natural-surface trails.
            </p>
          </div>
          <div className="card">
            <div className="text-xs font-bold uppercase tracking-wider text-orange-400 mb-2">Class 3</div>
            <div className="text-white font-semibold mb-1">Pedal-assist · 28 mph</div>
            <p className="text-sm text-gray-400">
              Pedal-assist up to 28 mph. Typically restricted to roadways and on-street
              bike lanes. Often requires a helmet and a minimum age (14–16).
            </p>
          </div>
        </div>
      </section>

      {/* Notable bans callout */}
      {bannedStates.length > 0 && (
        <section className="mb-10 rounded-xl border border-red-500/30 bg-red-500/5 p-5">
          <h2 className="text-lg font-bold text-red-400 mb-3 flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            States with notable restrictions or bans
          </h2>
          <p className="text-sm text-gray-300 mb-3">
            These states have not adopted the standard 3-class system, restrict Class 3 e-bikes
            as mopeds, or otherwise impose unusual requirements. Higher-power e-bikes may
            require a driver&apos;s license, registration, or insurance.
          </p>
          <div className="flex flex-wrap gap-2">
            {bannedStates.map((s) => (
              <a
                key={s.abbr}
                href={`#state-${s.abbr}`}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-300 hover:bg-red-500/20 transition-colors"
              >
                {s.state}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Federal lands */}
      <section className="mb-10 rounded-xl border border-gray-800 bg-gray-900/40 p-5">
        <h2 className="text-lg font-bold text-white mb-2">Federal lands</h2>
        <p className="text-sm text-gray-400">{FEDERAL_LAND_SUMMARY}</p>
      </section>

      {/* State table */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4">All 50 states + DC</h2>
        <div className="space-y-3">
          {EBIKE_LAWS.map((law) => {
            const path = pathBadge(law.bikePathAccess);
            const c3 = class3Badge(law.class3PathAccess);
            return (
              <details
                key={law.abbr}
                id={`state-${law.abbr}`}
                className="group rounded-xl border border-gray-800 bg-gray-900/40 hover:bg-gray-900/70 transition-colors"
              >
                <summary className="cursor-pointer list-none px-4 py-3 sm:px-5 sm:py-4 flex items-center gap-3 sm:gap-4">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/20 text-xs font-bold text-sky-400">
                    {law.abbr}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-white font-semibold truncate">{law.state}</h3>
                      {law.hasBan && (
                        <span className="inline-flex items-center rounded-full bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-400">
                          Restricted
                        </span>
                      )}
                      {!law.threeClassSystem && !law.hasBan && (
                        <span className="inline-flex items-center rounded-full bg-yellow-500/15 border border-yellow-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-yellow-400">
                          No 3-class
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-medium ${path.color}`}>
                        Bike paths: {path.text}
                      </span>
                      <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-medium ${c3.color}`}>
                        Class 3: {c3.text}
                      </span>
                      {law.minAgeClass3 !== null && (
                        <span className="inline-flex items-center rounded border border-gray-700 bg-gray-800/50 px-2 py-0.5 text-[10px] font-medium text-gray-400">
                          Min age {law.minAgeClass3}
                        </span>
                      )}
                    </div>
                  </div>
                  <svg className="h-5 w-5 text-gray-500 shrink-0 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </summary>
                <div className="border-t border-gray-800 px-4 py-3 sm:px-5 sm:py-4 space-y-2 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Helmet</div>
                      <p className="text-gray-300">{law.helmet}</p>
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">3-class system</div>
                      <p className="text-gray-300">{law.threeClassSystem ? "Adopted" : "Not adopted — older statute applies"}</p>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Notes</div>
                    <p className="text-gray-300">{law.notes}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-800 pt-3 text-xs">
                    <span className="text-gray-500">Verify with:</span>
                    <a
                      href={SOURCE_LINKS.peopleForBikesGuide}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:underline"
                    >
                      PeopleForBikes
                    </a>
                    <span className="text-gray-700">·</span>
                    <a
                      href={SOURCE_LINKS.ncslTracker}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:underline"
                    >
                      NCSL tracker
                    </a>
                    <span className="text-gray-700">·</span>
                    <a
                      href={`mailto:corrections@ridebyweather.com?subject=${encodeURIComponent(`E-bike law correction — ${law.state}`)}`}
                      className="text-gray-400 hover:text-sky-300"
                    >
                      Report a correction
                    </a>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      </section>

      {/* Footer CTA */}
      <div className="mt-12 rounded-xl border border-sky-500/20 bg-sky-500/5 p-6 text-center">
        <h2 className="text-lg font-bold text-white mb-2">Plan your ride with confidence</h2>
        <p className="text-sm text-gray-400 mb-4">
          Check current conditions and get a Ride Score for your location.
        </p>
        <Link href="/cycling" className="btn-primary text-sm px-5 py-2.5 inline-block">
          Open Ride Dashboard
        </Link>
      </div>
    </div>
  );
}
