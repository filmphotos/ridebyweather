"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface RideDetail {
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
  visibility: string;
  inviteCode: string;
  creator: { id: string; name: string | null; email: string };
  participants: {
    userId: string;
    name: string | null;
    email: string;
    status: "going" | "maybe";
    joinedAt: string;
  }[];
  isCreator: boolean;
  myRsvp: "going" | "maybe" | null;
}

interface ForecastScore {
  score: number;
  label: string;
  color: string;
  weather: {
    tempF: number;
    feelsLikeF: number;
    windSpeedMph: number;
    windGustMph: number;
    windDirDeg: number;
    precipProb: number;
    humidity: number;
    condition: string;
  };
}

export default function GroupRideDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [ride, setRide] = useState<RideDetail | null>(null);
  const [forecast, setForecast] = useState<ForecastScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [authed, setAuthed] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/group-rides/${id}`);
      if (res.status === 404) {
        setError("Ride not found");
        setRide(null);
        return;
      }
      const data = await res.json();
      setRide(data.ride);
      setForecast(data.forecastScore);
    } catch {
      setError("Failed to load ride");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setAuthed(!!d.user))
      .catch(() => setAuthed(false));
    load();
  }, [load]);

  async function rsvp(status: "going" | "maybe") {
    if (!authed) {
      router.push(`/login?next=/group-rides/${id}`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/group-rides/${id}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to RSVP");
      } else {
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    setBusy(true);
    try {
      const res = await fetch(`/api/group-rides/${id}/rsvp`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to leave");
      } else {
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function cancelRide() {
    if (!confirm("Cancel this ride? This cannot be undone.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/group-rides/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to cancel");
        setBusy(false);
      } else {
        router.push("/group-rides");
      }
    } catch {
      setBusy(false);
    }
  }

  async function copyShareLink() {
    const url = `${window.location.origin}/group-rides/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="card h-72 animate-pulse bg-gray-800" />
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-white">Ride not found</h1>
        <p className="mt-2 text-sm text-gray-400">It may have been cancelled or moved.</p>
        <Link href="/group-rides" className="btn-primary mt-6 inline-block px-4 py-2 text-sm">
          See all rides
        </Link>
      </div>
    );
  }

  const startDate = new Date(ride.startTime);
  const isPast = startDate.getTime() < Date.now();
  const goingCount = ride.participants.filter((p) => p.status === "going").length;
  const maybeCount = ride.participants.filter((p) => p.status === "maybe").length;
  const isFull = ride.maxRiders != null && goingCount >= ride.maxRiders && !ride.myRsvp;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/group-rides" className="text-sm text-gray-400 hover:text-gray-100">
        ← All group rides
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            ride.sport === "running"
              ? "bg-orange-500/20 text-orange-400"
              : "bg-sky-500/20 text-sky-400"
          }`}
        >
          {ride.sport}
        </span>
        {ride.visibility === "unlisted" && (
          <span className="inline-flex items-center rounded-full bg-gray-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-300">
            Unlisted
          </span>
        )}
        {isPast && (
          <span className="inline-flex items-center rounded-full bg-gray-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-300">
            Past
          </span>
        )}
      </div>

      <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-white">{ride.name}</h1>
      <p className="mt-1 text-sm text-gray-400">
        Hosted by {ride.creator.name ?? ride.creator.email.split("@")[0]}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column — details */}
        <div className="space-y-6 lg:col-span-2">
          <div className="card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Ride details
            </h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Row label="When">
                {startDate.toLocaleString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Row>
              <Row label="Where">{ride.locationName}</Row>
              {ride.distanceMi != null && (
                <Row label="Distance">{ride.distanceMi} mi</Row>
              )}
              {ride.pace && <Row label="Pace">{ride.pace}</Row>}
              <Row label="Capacity">
                {goingCount}
                {ride.maxRiders ? ` / ${ride.maxRiders}` : ""} going
                {maybeCount > 0 && ` • ${maybeCount} maybe`}
              </Row>
            </dl>
            {ride.description && (
              <p className="mt-4 whitespace-pre-wrap border-t border-gray-800 pt-4 text-sm text-gray-300">
                {ride.description}
              </p>
            )}
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Riders ({ride.participants.length})
            </h2>
            <ul className="mt-3 space-y-2">
              {ride.participants.map((p) => (
                <li
                  key={p.userId}
                  className="flex items-center justify-between rounded-lg bg-gray-900/60 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
                      {(p.name ?? p.email)[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="text-gray-100">
                        {p.name ?? p.email.split("@")[0]}
                        {p.userId === ride.creator.id && (
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-amber-400">
                            Host
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      p.status === "going"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    {p.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right column — RSVP + forecast */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              {isPast ? "Ride ended" : "Your RSVP"}
            </h2>

            {!isPast && (
              <div className="mt-3 flex flex-col gap-2">
                <button
                  onClick={() => rsvp("going")}
                  disabled={busy || isFull || ride.myRsvp === "going"}
                  className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                    ride.myRsvp === "going"
                      ? "bg-emerald-500 text-white"
                      : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                  }`}
                >
                  {ride.myRsvp === "going" ? "✓ You're going" : isFull ? "Ride is full" : "I'm going"}
                </button>
                <button
                  onClick={() => rsvp("maybe")}
                  disabled={busy || ride.myRsvp === "maybe"}
                  className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                    ride.myRsvp === "maybe"
                      ? "bg-amber-500 text-white"
                      : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                  }`}
                >
                  {ride.myRsvp === "maybe" ? "✓ Maybe" : "Maybe"}
                </button>
                {ride.myRsvp && !ride.isCreator && (
                  <button
                    onClick={leave}
                    disabled={busy}
                    className="w-full rounded-lg px-4 py-2 text-xs text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    Leave ride
                  </button>
                )}
              </div>
            )}

            <div className="mt-4 flex gap-2 border-t border-gray-800 pt-4">
              <button
                onClick={copyShareLink}
                className="flex-1 rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 transition-colors"
              >
                {copied ? "✓ Copied" : "Copy share link"}
              </button>
              {ride.isCreator && !isPast && (
                <button
                  onClick={cancelRide}
                  disabled={busy}
                  className="rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  Cancel ride
                </button>
              )}
            </div>
          </div>

          {forecast && !isPast && (
            <div className="card">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Forecast Ride Score
              </h2>
              <div className="mt-3 flex items-center gap-4">
                <div
                  className="flex h-20 w-20 flex-col items-center justify-center rounded-full border-4 text-center"
                  style={{ borderColor: forecast.color }}
                >
                  <span className="text-2xl font-bold" style={{ color: forecast.color }}>
                    {forecast.score.toFixed(1)}
                  </span>
                </div>
                <div>
                  <div
                    className="text-sm font-bold uppercase tracking-wide"
                    style={{ color: forecast.color }}
                  >
                    {forecast.label}
                  </div>
                  <div className="mt-1 text-xs text-gray-400 capitalize">
                    {forecast.weather.condition}
                  </div>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-gray-800 pt-3 text-xs">
                <Mini label="Temp" value={`${Math.round(forecast.weather.tempF)}°F`} />
                <Mini label="Feels" value={`${Math.round(forecast.weather.feelsLikeF)}°F`} />
                <Mini
                  label="Wind"
                  value={`${Math.round(forecast.weather.windSpeedMph)} mph`}
                />
                <Mini
                  label="Gust"
                  value={`${Math.round(forecast.weather.windGustMph)} mph`}
                />
                <Mini
                  label="Precip"
                  value={`${Math.round(forecast.weather.precipProb * 100)}%`}
                />
                <Mini label="Humidity" value={`${forecast.weather.humidity}%`} />
              </dl>
              <p className="mt-3 text-[11px] text-gray-500">
                Forecast at start time — updated when you reload.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
      <dt className="w-20 shrink-0 text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="text-gray-200">{children}</dd>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-200">{value}</span>
    </div>
  );
}
