import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CITY_GUIDES, getCityGuide } from "@/lib/routeGuides";

export async function generateStaticParams() {
  return CITY_GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = getCityGuide(slug);
  if (!guide) return { title: "Guide not found" };
  return {
    title: `${guide.city} Ride Guide — RideByWeather`,
    description: `Best rides, wind patterns, and season-by-season advice for cycling in ${guide.city}, ${guide.state}.`,
  };
}

export default async function CityGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getCityGuide(slug);
  if (!guide) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link href="/guides" className="text-xs text-sky-400 hover:text-sky-300">← All guides</Link>
        <div className="mt-2 text-xs uppercase tracking-wide text-gray-500">{guide.state}</div>
        <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold text-white">{guide.city} Ride Guide</h1>
        <p className="mt-4 text-gray-300 text-base sm:text-lg">{guide.intro}</p>
      </div>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-white">Climatology</h2>
        <p className="mt-3 text-sm text-gray-300">{guide.climatology}</p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-white">Season by season</h2>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {guide.seasons.map((s) => (
            <div key={s.name} className="card">
              <div className="flex items-baseline justify-between">
                <h3 className="text-base font-semibold text-white">{s.name}</h3>
                <span className="text-xs text-gray-500">{s.window}</span>
              </div>
              <p className="mt-2 text-sm text-gray-300">{s.advice}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-white">Signature rides</h2>
        <div className="mt-4 space-y-4">
          {guide.rides.map((r) => (
            <div key={r.name} className="card">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-base font-semibold text-white">{r.name}</h3>
                <span className="text-xs text-gray-500 shrink-0 tabular-nums">{r.miles} mi</span>
              </div>
              <div className="mt-1 text-xs uppercase tracking-wide text-sky-400">
                Best with headwind: {r.bestWindOut}
              </div>
              <p className="mt-2 text-sm text-gray-300">{r.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-6 text-center">
        <p className="text-gray-300 text-sm">
          Want today&apos;s Ride Score for {guide.city}?
        </p>
        <Link href="/cycling" className="btn-primary mt-3 inline-block">Check the score</Link>
      </section>
    </article>
  );
}
