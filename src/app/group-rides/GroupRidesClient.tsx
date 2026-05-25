"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface RideListItem {
  id: string;
  name: string;
  description: string | null;
  sport: string;
  startTime: string;
  lat: number;
  lng: number;
  locationName: string;
  pace: string | null;
  distanceMi: number | null;
  maxRiders: number | null;
  creator: { id: string; name: string | null; email: string };
  participantCount: number;
  myRsvp: "going" | "maybe" | null;
  isCreator: boolean;
}

type Scope = "upcoming" | "mine";
type SportFilter = "all" | "cycling" | "running";

export default function GroupRidesClient() {
  const [rides, setRides] = useState<RideListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<Scope>("upcoming");
  const [sport, setSport] = useState<SportFilter>("all");
  const [authed, setAuthed] = useState<boolean>(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setAuthed(!!d.user))
      .catch(() => setAuthed(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const url = new URL("/api/group-rides", window.location.origin);
    if (scope === "mine") url.searchParams.set("scope", "mine");
    if (sport !== "all") url.searchParams.set("sport", sport);

    fetch(url.toString())
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setRides(d.rides ?? []);
      })
      .catch(() => {
        if (!cancelled) setRides([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scope, sport]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Group Rides</h1>
          <p className="mt-1 text-sm text-gray-400">
            Weather-aware meetups — see the Ride Score for ride day before you commit.
          </p>
        </div>
        {authed ? (
          <Link href="/group-rides/new" className="btn-primary text-sm px-4 py-2 whitespace-nowrap">
            + Create Ride
          </Link>
        ) : (
          <Link href="/login?next=/group-rides/new" className="btn-primary text-sm px-4 py-2 whitespace-nowrap">
            Log in to create
          </Link>
        )}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <div className="inline-flex rounded-lg border border-gray-800 bg-gray-900 p-0.5 text-xs">
          <button
            onClick={() => setScope("upcoming")}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              scope === "upcoming" ? "bg-sky-500 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Upcoming
          </button>
          {authed && (
            <button
              onClick={() => setScope("mine")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                scope === "mine" ? "bg-sky-500 text-white" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              My Rides
            </button>
          )}
        </div>

        <div className="inline-flex rounded-lg border border-gray-800 bg-gray-900 p-0.5 text-xs">
          {(["all", "cycling", "running"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSport(s)}
              className={`px-3 py-1.5 rounded-md transition-colors capitalize ${
                sport === s ? "bg-sky-500 text-white" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-44 animate-pulse bg-gray-800" />
          ))}
        </div>
      )}

      {!loading && rides.length === 0 && (
        <div className="card text-center py-16">
          <div className="text-5xl mb-3">🚴‍♂️</div>
          <h2 className="text-lg font-semibold text-white">
            {scope === "mine" ? "You haven't joined any rides yet" : "No upcoming rides"}
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            {scope === "mine"
              ? "Browse upcoming rides or host your own."
              : "Be the first to host one in your area."}
          </p>
          {authed && (
            <Link href="/group-rides/new" className="btn-primary mt-6 inline-block text-sm px-4 py-2">
              Create a ride
            </Link>
          )}
        </div>
      )}

      {!loading && rides.length > 0 && (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rides.map((r) => (
            <li key={r.id}>
              <Link
                href={`/group-rides/${r.id}`}
                className="card block h-full transition-colors hover:border-sky-500/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      r.sport === "running"
                        ? "bg-orange-500/20 text-orange-400"
                        : "bg-sky-500/20 text-sky-400"
                    }`}
                  >
                    {r.sport}
                  </span>
                  {r.myRsvp && (
                    <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400">
                      {r.myRsvp}
                    </span>
                  )}
                </div>

                <h3 className="mt-3 text-lg font-semibold text-white line-clamp-2">{r.name}</h3>

                <div className="mt-3 space-y-1.5 text-sm text-gray-400">
                  <div className="flex items-start gap-1.5">
                    <span>📅</span>
                    <span>{formatDateTime(r.startTime)}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span>📍</span>
                    <span className="line-clamp-1">{r.locationName}</span>
                  </div>
                  {r.distanceMi != null && (
                    <div className="flex items-start gap-1.5">
                      <span>📏</span>
                      <span>{r.distanceMi} mi{r.pace ? ` • ${r.pace}` : ""}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {r.participantCount} {r.participantCount === 1 ? "rider" : "riders"}
                    {r.maxRiders && ` / ${r.maxRiders}`}
                  </span>
                  <span>by {r.creator.name ?? r.creator.email.split("@")[0]}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
