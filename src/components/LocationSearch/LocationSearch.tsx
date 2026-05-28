"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GeoResult } from "@/app/api/geocode/route";

export interface PickedLocation {
  lat: number;
  lng: number;
  name?: string;
}

interface Props {
  onSelect: (loc: PickedLocation) => void;
  autoDetect?: boolean;
  placeholder?: string;
}

// Shared location picker: geocode autocomplete + browser GPS with IP fallback.
// Mirrors the cycling dashboard's logic so every tool page locates the same way.
export default function LocationSearch({ onSelect, autoDetect = true, placeholder = "Enter city, ZIP, or address…" }: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const detectLocation = useCallback(async () => {
    const tryBrowserGeo = (): Promise<{ lat: number; lng: number } | null> =>
      new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        const timer = setTimeout(() => resolve(null), 4000);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timer);
            resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          },
          () => {
            clearTimeout(timer);
            resolve(null);
          },
          { timeout: 4000, maximumAge: 600_000 }
        );
      });

    const browserLoc = await tryBrowserGeo();
    if (browserLoc) {
      onSelect(browserLoc);
      return;
    }
    try {
      const res = await fetch("/api/geo-ip");
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.lat === "number" && typeof data.lng === "number") {
        onSelect({ lat: data.lat, lng: data.lng, name: data.name });
      }
    } catch {
      // user can fall back to manual search
    }
  }, [onSelect]);

  useEffect(() => {
    if (autoDetect) detectLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const select = (r: GeoResult) => {
    setQuery(r.display);
    setSuggestions([]);
    setShowSuggestions(false);
    onSelect({ lat: r.lat, lng: r.lng, name: r.display });
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
      <div ref={searchRef} className="relative w-full sm:w-72">
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          className="w-full rounded-lg bg-gray-800 border border-gray-700 pl-4 pr-8 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500"
        />
        {searchLoading && (
          <div className="absolute right-2 top-2.5 h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-sky-400" />
        )}
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute top-full left-0 z-50 mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 shadow-xl overflow-hidden">
            {suggestions.map((r, i) => (
              <li key={i}>
                <button
                  onMouseDown={() => select(r)}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-gray-800 transition-colors"
                >
                  <span className="font-medium">{r.name}</span>
                  {r.display !== r.name && (
                    <span className="ml-1.5 text-gray-500 text-xs">
                      {r.display.replace(r.name + ", ", "")}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button onClick={detectLocation} className="btn-secondary text-sm px-4 py-2 whitespace-nowrap">
        📍 My Location
      </button>
    </div>
  );
}
