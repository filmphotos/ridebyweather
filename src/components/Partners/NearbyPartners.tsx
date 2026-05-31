"use client";

import { useEffect, useState } from "react";
import { fetchPartners } from "@/lib/partnersClient";

interface Partner {
  id: string;
  name: string;
  type: string;
  address: string;
  phone: string | null;
  website: string | null;
  description: string | null;
  isVerified: boolean;
  tier: string;
  distanceMi: number;
}

interface Props {
  lat: number;
  lng: number;
  sport?: "cycling" | "running";
  // Dedicated /bike-shops and /run-stores pages set this false so only the
  // shop listings render. Dashboards leave it true to also surface nearby
  // medical and restaurant stops.
  extras?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  bike_shop: "Bike Shop",
  running_store: "Running Store",
  gym: "Gym",
  hospital: "Hospital",
  urgent_care: "Urgent Care",
  clinic: "Clinic",
  restaurant: "Restaurant",
  cafe: "Cafe",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  bike_shop: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="5.5" cy="17.5" r="3.5" /><circle cx="18.5" cy="17.5" r="3.5" />
      <path strokeLinecap="round" d="M5.5 17.5L9 9l4 3 3-5.5h2M9 9h5" />
    </svg>
  ),
  running_store: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 4a1 1 0 100-2 1 1 0 000 2zm-3 3l2 5 4-2 2 4M7 20l3-6 3 2" />
    </svg>
  ),
  gym: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" d="M4 12h3m10 0h3M7 12V7m0 10v-5M17 12V7m0 10v-5M9 7h6M9 17h6" />
    </svg>
  ),
  hospital: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="4" y="5" width="16" height="15" rx="1.5" />
      <path strokeLinecap="round" d="M12 9v6M9 12h6" />
    </svg>
  ),
  urgent_care: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3h6v3h3v6h-3v3H9v-3H6V9h3z" />
    </svg>
  ),
  clinic: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z" />
    </svg>
  ),
  restaurant: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v8a2 2 0 002 2v8M11 3v8a2 2 0 01-2 2M15 3c-1.5 1-2.5 3-2.5 6 0 2 1 3 2.5 3v9" />
    </svg>
  ),
  cafe: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h11v6a4 4 0 01-4 4H8a4 4 0 01-4-4V8zM15 9h2a3 3 0 010 6h-2M6 2v3M9 2v3M12 2v3" />
    </svg>
  ),
};

function PartnerRow({ p }: { p: Partner }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-800 bg-gray-800/40 p-3 hover:border-gray-700 transition-colors">
      <div className={`flex-shrink-0 mt-0.5 rounded-lg p-2 ${
        p.type === "hospital" || p.type === "urgent_care" || p.type === "clinic"
          ? "bg-rose-500/20 text-rose-400"
          : p.type === "restaurant" || p.type === "cafe"
          ? "bg-amber-500/20 text-amber-400"
          : p.tier === "enterprise" ? "bg-sky-500/20 text-sky-400"
          : p.tier === "pro" ? "bg-indigo-500/20 text-indigo-400"
          : "bg-gray-700 text-gray-400"
      }`}>
        {TYPE_ICONS[p.type] ?? TYPE_ICONS.bike_shop}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-100 truncate">{p.name}</span>
          {p.isVerified && (
            <svg className="h-3.5 w-3.5 text-sky-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-gray-500">{TYPE_LABELS[p.type] ?? p.type}</span>
          <span className="text-gray-700 text-xs">·</span>
          <span className="text-xs text-gray-500">{p.distanceMi.toFixed(1)} mi away</span>
        </div>
        {p.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{p.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          {p.website && (
            <a
              href={p.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-sky-400 hover:text-sky-300 hover:underline"
            >
              Website
            </a>
          )}
          {p.phone && (
            <a href={`tel:${p.phone}`} className="text-xs text-gray-500 hover:text-gray-300">
              {p.phone}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NearbyPartners({ lat, lng, sport = "cycling", extras = true }: Props) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [medical, setMedical] = useState<Partner[]>([]);
  const [restaurants, setRestaurants] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const ctrl = new AbortController();
    fetchPartners({ lat, lng, sport, radiusMi: 25, signal: ctrl.signal })
      .then((d) => {
        setPartners((d.partners ?? []) as Partner[]);
        setMedical((d.medical ?? []) as Partner[]);
        setRestaurants((d.restaurants ?? []) as Partner[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [lat, lng, sport]);

  if (loading) {
    return (
      <div className="card">
        <h3 className="font-semibold text-white mb-3">Nearby Shops</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-gray-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-white">Nearby Shops</h3>
        <span className="text-xs text-gray-500">within 25 mi</span>
      </div>
      {partners.length > 0 ? (
        <>
          <div className="space-y-2">
            {partners.map((p) => <PartnerRow key={p.id} p={p} />)}
          </div>
          <a
            href="mailto:partners@ridebyweather.com"
            className="mt-3 block text-center text-xs text-gray-600 hover:text-sky-400 transition-colors"
          >
            List your shop here →
          </a>
        </>
      ) : (
        <>
          <p className="text-xs text-gray-500">No partner shops found within 25 miles.</p>
          <a
            href="mailto:partners@ridebyweather.com"
            className="mt-3 inline-block text-xs text-sky-400 hover:underline"
          >
            List your shop →
          </a>
        </>
      )}

      {extras && (
        <>
          <div className={`flex items-center justify-between mb-3 ${partners.length > 0 ? "mt-5 pt-4 border-t border-gray-800" : ""}`}>
            <h3 className="font-semibold text-white">Nearby Medical</h3>
            <span className="text-xs text-gray-500">hospitals & urgent care</span>
          </div>
          {medical.length > 0 ? (
            <div className="space-y-2">
              {medical.map((m) => <PartnerRow key={m.id} p={m} />)}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No hospitals or urgent care found within 25 mi.</p>
          )}

          <div className="flex items-center justify-between mb-3 mt-5 pt-4 border-t border-gray-800">
            <h3 className="font-semibold text-white">Nearby Restaurants</h3>
            <span className="text-xs text-gray-500">restaurants & cafes</span>
          </div>
          {restaurants.length > 0 ? (
            <div className="space-y-2">
              {restaurants.map((r) => <PartnerRow key={r.id} p={r} />)}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No restaurants or cafes found within 25 mi.</p>
          )}
        </>
      )}
    </div>
  );
}
