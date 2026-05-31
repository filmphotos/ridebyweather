"use client";

import { useCallback, useEffect, useState } from "react";
import LocationSearch, { type PickedLocation } from "@/components/LocationSearch/LocationSearch";

interface DailyForecast {
  date: string;
  score: number;
  label: string;
  color: string;
  tempMaxF: number;
  tempMinF: number;
  precipProb: number;
  windSpeedMaxMph: number;
  windGustMaxMph: number;
  condition: string;
}

interface SavedEvent {
  name: string;
  date: string; // ISO date
  location: { lat: number; lng: number; name?: string };
}

export default function EventClient() {
  const [event, setEvent] = useState<SavedEvent | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [dateDraft, setDateDraft] = useState("");
  const [pickedLoc, setPickedLoc] = useState<PickedLocation | null>(null);

  const [daily, setDaily] = useState<DailyForecast[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("rbw_event");
      if (!raw) return;
      const saved = JSON.parse(raw) as SavedEvent;
      setEvent(saved);
    } catch {}
  }, []);

  const loadForecast = useCallback(async (ev: SavedEvent) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/weather/daily?lat=${ev.location.lat}&lng=${ev.location.lng}&days=14`);
      if (!res.ok) throw new Error("Failed to load forecast");
      const json = await res.json();
      setDaily(json.daily);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (event) loadForecast(event);
  }, [event, loadForecast]);

  const save = () => {
    if (!nameDraft || !dateDraft || !pickedLoc) return;
    const ev: SavedEvent = { name: nameDraft, date: dateDraft, location: pickedLoc };
    try { localStorage.setItem("rbw_event", JSON.stringify(ev)); } catch {}
    setEvent(ev);
  };

  const clear = () => {
    try { localStorage.removeItem("rbw_event"); } catch {}
    setEvent(null);
    setDaily(null);
    setNameDraft("");
    setDateDraft("");
    setPickedLoc(null);
  };

  const eventDay = event ? findDay(daily, event.date) : null;
  const daysOut = event ? daysBetween(new Date(), new Date(event.date)) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Event Countdown</h1>
        <p className="mt-1 text-sm text-gray-400 max-w-xl">
          Pin a gran fondo, century, race, or commute-day-that-matters. Watch the forecast as it
          enters the 14-day window.
        </p>
      </div>

      {!event && (
        <div className="card max-w-xl">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Pin an event</h2>
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs text-gray-400">Event name</label>
              <input
                type="text"
                placeholder="e.g. Tour de Smoke 2026"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Date</label>
              <input
                type="date"
                value={dateDraft}
                onChange={(e) => setDateDraft(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Location</label>
              <div className="mt-1">
                <LocationSearch onSelect={(loc) => setPickedLoc(loc)} />
              </div>
              {pickedLoc?.name && <p className="mt-1 text-xs text-gray-500">{pickedLoc.name}</p>}
            </div>
            <button
              onClick={save}
              disabled={!nameDraft || !dateDraft || !pickedLoc}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Pin event
            </button>
          </div>
        </div>
      )}

      {event && (
        <>
          <div className="mb-6 card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Pinned</div>
                <h2 className="mt-1 text-xl font-bold text-white">{event.name}</h2>
                <p className="text-sm text-gray-400">
                  {new Date(event.date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  {event.location.name ? ` · ${event.location.name}` : ""}
                </p>
                {daysOut != null && (
                  <p className="mt-2 text-3xl font-bold text-sky-400 tabular-nums">{daysOut} {daysOut === 1 ? "day" : "days"} out</p>
                )}
              </div>
              <button onClick={clear} className="text-xs text-gray-400 hover:text-red-400">Change</button>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">{error}</div>
          )}
          {loading && <div className="card h-48 animate-pulse bg-gray-800" />}

          {!loading && eventDay && (
            <div className="card mb-6 border-sky-500/30 ring-1 ring-sky-500/20">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Event-day forecast</h2>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-4" style={{ borderColor: eventDay.color }}>
                  <span className="text-3xl font-bold" style={{ color: eventDay.color }}>{eventDay.score.toFixed(1)}</span>
                </div>
                <div>
                  <div className="text-base font-bold uppercase tracking-wide" style={{ color: eventDay.color }}>{eventDay.label}</div>
                  <p className="text-sm text-gray-400">
                    {Math.round(eventDay.tempMinF)}–{Math.round(eventDay.tempMaxF)}°F · wind {Math.round(eventDay.windSpeedMaxMph)}mph · {Math.round(eventDay.precipProb * 100)}% rain
                  </p>
                </div>
              </div>
            </div>
          )}

          {!loading && daily && !eventDay && daysOut != null && daysOut > 14 && (
            <div className="card text-center text-gray-400">
              Event is {daysOut} days away — forecast unlocks within 14 days. Check back closer.
            </div>
          )}

          {!loading && daily && (
            <div className="card">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">14-day score trajectory</h2>
              <div className="mt-4 grid grid-cols-7 gap-1.5">
                {daily.map((d) => {
                  const isEvent = sameDate(d.date, event.date);
                  return (
                    <div key={d.date} className={`rounded p-1.5 text-center ${isEvent ? "ring-2 ring-sky-400" : ""}`} style={{ backgroundColor: d.color + "22" }}>
                      <div className="text-[10px] text-gray-400">
                        {new Date(d.date).toLocaleDateString(undefined, { weekday: "short" })}
                      </div>
                      <div className="text-base font-bold tabular-nums" style={{ color: d.color }}>
                        {d.score.toFixed(1)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function findDay(daily: DailyForecast[] | null, eventDate: string): DailyForecast | null {
  if (!daily) return null;
  return daily.find((d) => sameDate(d.date, eventDate)) ?? null;
}

function sameDate(a: string | Date, b: string | Date): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getUTCFullYear() === db.getUTCFullYear() && da.getUTCMonth() === db.getUTCMonth() && da.getUTCDate() === db.getUTCDate();
}

function daysBetween(now: Date, target: Date): number {
  const ms = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (24 * 3600 * 1000)));
}
