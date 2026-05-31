"use client";

import { useCallback, useRef, useState } from "react";
import LocationSearch, { type PickedLocation } from "@/components/LocationSearch/LocationSearch";

interface Briefing {
  score: number;
  label: string;
  color: string;
  tempF: number;
  feelsLikeF: number;
  windSpeedMph: number;
  windGustMph: number;
  precipProb: number;
  condition: string;
  sentences: string[];
}

export default function BriefingClient() {
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const buildBriefing = (loc: PickedLocation, score: { score: number; label: string; color: string; weather: { tempF: number; feelsLikeF: number; windSpeedMph: number; windGustMph: number; precipProb: number; condition: string } }): Briefing => {
    const w = score.weather;
    const where = loc.name?.split(",")[0] ?? "your area";
    const cond = w.condition;
    const today = new Date().toLocaleDateString(undefined, { weekday: "long" });

    const sentences = [
      `Good morning. It's ${today} in ${where}.`,
      `Your Ride Score is ${score.score.toFixed(1)} — ${score.label.toLowerCase()}.`,
      `Expect ${Math.round(w.tempF)} degrees, feels like ${Math.round(w.feelsLikeF)}, with ${Math.round(w.windSpeedMph)} mile per hour winds and ${cond} skies.`,
      w.precipProb >= 0.3
        ? `Rain chance is ${Math.round(w.precipProb * 100)} percent — bring a shell.`
        : `Rain chance is low at ${Math.round(w.precipProb * 100)} percent. Ride dry.`,
    ];

    return {
      score: score.score,
      label: score.label,
      color: score.color,
      tempF: w.tempF,
      feelsLikeF: w.feelsLikeF,
      windSpeedMph: w.windSpeedMph,
      windGustMph: w.windGustMph,
      precipProb: w.precipProb,
      condition: w.condition,
      sentences,
    };
  };

  const load = useCallback(async (loc: PickedLocation) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ride-score?lat=${loc.lat}&lng=${loc.lng}`);
      if (!res.ok) throw new Error("Failed to load conditions");
      const json = await res.json();
      const b = buildBriefing(loc, json);
      setBriefing(b);
      // Draw card.
      requestAnimationFrame(() => drawCard(canvasRef.current, b, loc.name ?? ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelect = useCallback(
    (loc: PickedLocation) => {
      setLocation(loc);
      load(loc);
    },
    [load]
  );

  const speak = () => {
    if (!briefing) return;
    const synth = window.speechSynthesis;
    if (!synth) {
      setError("Your browser doesn't support speech synthesis.");
      return;
    }
    synth.cancel();
    const text = briefing.sentences.join(" ");
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.0;
    utter.pitch = 1.0;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    synth.speak(utter);
  };

  const stop = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  };

  const downloadCard = () => {
    const c = canvasRef.current;
    if (!c) return;
    const url = c.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "ridebyweather-briefing.png";
    a.click();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Morning Briefing</h1>
          <p className="mt-1 text-sm text-gray-400 max-w-xl">
            A 20-second spoken summary of today&apos;s ride. Tap play, or download as a card to
            share.
          </p>
          {location?.name && <p className="mt-1 text-sm text-gray-500">{location.name}</p>}
        </div>
        <LocationSearch onSelect={handleSelect} />
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">{error}</div>
      )}
      {loading && <div className="card h-48 animate-pulse bg-gray-800" />}

      {!loading && briefing && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Briefing</h2>
            <div className="mt-3 space-y-2 text-base text-gray-200">
              {briefing.sentences.map((s, i) => (
                <p key={i}>{s}</p>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {!speaking ? (
                <button onClick={speak} className="btn-primary">▶ Play briefing</button>
              ) : (
                <button onClick={stop} className="btn-secondary">⏸ Stop</button>
              )}
              <button onClick={downloadCard} className="btn-secondary">Download card</button>
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Shareable card</h2>
            <div className="mt-3 overflow-x-auto">
              <canvas ref={canvasRef} width={1080} height={1080} className="w-full max-w-md rounded-xl border border-gray-800" />
            </div>
          </div>
        </div>
      )}

      {!loading && !briefing && !error && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="text-6xl">🎙️</div>
          <p className="text-gray-400">Pick a location to generate today&apos;s briefing.</p>
        </div>
      )}
    </div>
  );
}

function drawCard(canvas: HTMLCanvasElement | null, b: Briefing, name: string) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;

  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#0c1428");
  grad.addColorStop(1, "#0b1124");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Score ring.
  ctx.lineWidth = 36;
  ctx.strokeStyle = b.color;
  ctx.beginPath();
  ctx.arc(W / 2, 380, 180, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = b.color;
  ctx.textAlign = "center";
  ctx.font = "bold 180px Inter, sans-serif";
  ctx.fillText(b.score.toFixed(1), W / 2, 440);
  ctx.font = "bold 36px Inter, sans-serif";
  ctx.fillText(b.label.toUpperCase(), W / 2, 610);

  // Conditions row.
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "32px Inter, sans-serif";
  ctx.fillText(`${Math.round(b.tempF)}°F · ${Math.round(b.windSpeedMph)} mph · ${Math.round(b.precipProb * 100)}% rain`, W / 2, 700);

  if (name) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "28px Inter, sans-serif";
    ctx.fillText(name, W / 2, 760);
  }

  // Brand mark.
  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 40px Inter, sans-serif";
  ctx.fillText("RideByWeather", W / 2, 980);
  ctx.fillStyle = "#475569";
  ctx.font = "24px Inter, sans-serif";
  ctx.fillText("ridebyweather.com", W / 2, 1020);
}
