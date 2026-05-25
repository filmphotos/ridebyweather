"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { GeoResult } from "@/app/api/geocode/route";

export default function NewGroupRideClient() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sport, setSport] = useState<"cycling" | "running">("cycling");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [pace, setPace] = useState("");
  const [distanceMi, setDistanceMi] = useState("");
  const [maxRiders, setMaxRiders] = useState("");
  const [visibility, setVisibility] = useState<"public" | "unlisted">("public");

  // Location search
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [selected, setSelected] = useState<GeoResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setAuthed(!!d.user);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(value)}`);
        const json = await res.json();
        setSuggestions(json.results ?? []);
        setShowSuggestions(true);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  const pickSuggestion = (g: GeoResult) => {
    setSelected(g);
    setQuery(g.display);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selected) {
      setError("Please pick a location from the suggestions.");
      return;
    }
    if (!date || !time) {
      setError("Please choose a date and time.");
      return;
    }

    const startTime = new Date(`${date}T${time}`);
    if (Number.isNaN(startTime.getTime())) {
      setError("Invalid date/time.");
      return;
    }
    if (startTime.getTime() <= Date.now()) {
      setError("Start time must be in the future.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/group-rides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          sport,
          startTime: startTime.toISOString(),
          lat: selected.lat,
          lng: selected.lng,
          locationName: selected.display,
          pace: pace.trim() || null,
          distanceMi: distanceMi ? Number(distanceMi) : null,
          maxRiders: maxRiders ? Number(maxRiders) : null,
          visibility,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create ride");
        setSubmitting(false);
        return;
      }
      router.push(`/group-rides/${data.ride.id}`);
    } catch {
      setError("Network error — please try again.");
      setSubmitting(false);
    }
  }

  if (authChecked && !authed) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-white">Log in to host a group ride</h1>
        <p className="mt-2 text-sm text-gray-400">You need an account to create rides others can join.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/login?next=/group-rides/new" className="btn-primary px-4 py-2 text-sm">
            Log in
          </Link>
          <Link href="/signup?next=/group-rides/new" className="btn-secondary px-4 py-2 text-sm">
            Sign up
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/group-rides" className="text-sm text-gray-400 hover:text-gray-100">
          ← All group rides
        </Link>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-white">Create a group ride</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Ride name" required>
          <input
            type="text"
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Saturday Coffee Loop"
            className={INPUT_CLS}
          />
        </Field>

        <Field label="Sport">
          <div className="inline-flex rounded-lg border border-gray-800 bg-gray-900 p-0.5 text-sm">
            {(["cycling", "running"] as const).map((s) => (
              <button
                type="button"
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
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Date" required>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Start time" required>
            <input
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={INPUT_CLS}
            />
          </Field>
        </div>

        <Field label="Meeting location" required>
          <div ref={searchRef} className="relative">
            <input
              type="text"
              required
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Search a city, town, or landmark…"
              className={`${INPUT_CLS} pr-8`}
            />
            {searchLoading && (
              <div className="absolute right-2 top-2.5 h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-sky-400" />
            )}
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute top-full left-0 z-50 mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 shadow-xl overflow-hidden">
                {suggestions.map((r, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onMouseDown={() => pickSuggestion(r)}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-gray-800 transition-colors"
                    >
                      <span className="font-medium">{r.name}</span>
                      {r.display !== r.name && (
                        <span className="ml-1.5 text-xs text-gray-500">
                          {r.display.replace(r.name + ", ", "")}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {selected && (
            <p className="mt-1 text-xs text-emerald-400">
              📍 {selected.display}
            </p>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Distance (mi)">
            <input
              type="number"
              min={0}
              max={500}
              step="0.1"
              value={distanceMi}
              onChange={(e) => setDistanceMi(e.target.value)}
              placeholder="25"
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Pace / effort">
            <input
              type="text"
              maxLength={40}
              value={pace}
              onChange={(e) => setPace(e.target.value)}
              placeholder="Social, 15–17 mph"
              className={INPUT_CLS}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Max riders (optional)">
            <input
              type="number"
              min={2}
              max={500}
              value={maxRiders}
              onChange={(e) => setMaxRiders(e.target.value)}
              placeholder="No limit"
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Visibility">
            <div className="inline-flex rounded-lg border border-gray-800 bg-gray-900 p-0.5 text-sm">
              {(["public", "unlisted"] as const).map((v) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => setVisibility(v)}
                  className={`px-3 py-1.5 rounded-md transition-colors capitalize ${
                    visibility === v ? "bg-sky-500 text-white" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <Field label="Description">
          <textarea
            rows={4}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Anything riders should know — route notes, café stop, what to bring."
            className={`${INPUT_CLS} resize-none`}
          />
        </Field>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Link href="/group-rides" className="btn-secondary text-sm px-4 py-2">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary text-sm px-5 py-2 disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create ride"}
          </button>
        </div>
      </form>

    </div>
  );
}

const INPUT_CLS =
  "w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-400 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </span>
      {children}
    </label>
  );
}
