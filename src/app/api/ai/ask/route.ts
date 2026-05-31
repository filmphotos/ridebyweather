import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { getAuthPayload } from "@/lib/auth";
import { getUserTier, requirePro } from "@/lib/tier";
import { getWeatherProvider } from "@/lib/weather";
import { computeCyclingScore } from "@/lib/ride-score";
import { findBestRideWindow } from "@/lib/push";
import { db } from "@/lib/db";

// AI Ride Assistant — the Pro chat that ties everything together.
// User asks: "What should I wear at 7 AM tomorrow?", "Best spot for a 30-mi ride
// this weekend?", "Is Tuesday or Saturday better?". We pull their forecast +
// saved spots into Claude's context so answers are grounded in real data, not
// hallucinated.
//
// Why server-side: Anthropic API key never touches the browser. Why streaming:
// chat UX feels broken if it pauses 3+ seconds before the first token.

export const maxDuration = 60;
export const runtime = "nodejs";

const BodySchema = z.object({
  question: z.string().min(1).max(2000),
  // Optional short history so follow-ups have context. Capped to keep the
  // prompt cache-friendly — we don't want every turn to balloon the prefix.
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      })
    )
    .max(10)
    .optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

// Stable system prompt. Kept here (not interpolated with timestamps/IDs) so the
// prompt cache actually catches across turns — see SDK guide on prefix caching.
const SYSTEM_PROMPT = `You are the RideByWeather AI assistant — a concise, helpful expert on cycling, running, and walking in weather. You help users decide what to wear, when to ride, and where to go.

Style rules:
- Direct and concrete. Specific recommendations, not generic advice.
- Use the Ride Score (0-10) and labels (PERFECT, GREAT, GOOD, NEUTRAL, TOUGH, POOR, DANGEROUS) from the provided <context> block when answering.
- When recommending clothing, name specific items (e.g. "long-sleeve jersey + wind vest + knee warmers" not "warm layers").
- If the user asks about a city or time the <context> block doesn't cover, say so politely instead of guessing.
- Default to under 150 words. Use a short bulleted list only when it's genuinely useful.
- Never fabricate weather numbers. If the data isn't in <context>, say "I don't have current data for that — try the relevant page on RideByWeather to pull it."

Features users have access to so you can point them in the right direction:
- Free: current Ride Score, 7-day forecast, hydration coach, sun & UV, e-bike laws, hospitals/medical near me, 3 saved routes, 1 saved ride spot.
- Pro: "Where Should I Ride?" multi-location scanner (/spots), 24-hour route forecast on the Route Planner (/routes), 14-day forecast, daily best-window push alerts, unlimited routes and spots.

Format temperature in °F, wind in mph, time in 12-hour local format. American English.`;

export async function POST(req: NextRequest) {
  const payload = await getAuthPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tier = await getUserTier(payload.userId);
  const gate = requirePro(tier, "AI Ride Assistant");
  if (gate) return gate;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI not configured — ANTHROPIC_API_KEY missing on server." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { question, history, lat, lng } = parsed.data;

  // Pull data in parallel. Spots are cheap (one DB row per spot). Weather is
  // capped at 36 hours — enough to answer "today vs tomorrow" without blowing
  // the token budget.
  const [spots, currentWeather, forecast] = await Promise.all([
    db.rideSpot.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: "asc" },
      take: 10,
    }),
    lat !== undefined && lng !== undefined
      ? getWeatherProvider()
          .getCurrentWeather({ lat, lng })
          .catch(() => null)
      : Promise.resolve(null),
    lat !== undefined && lng !== undefined
      ? getWeatherProvider()
          .getHourlyForecast({ lat, lng }, 36)
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  const contextLines: string[] = [];

  if (currentWeather) {
    const score = computeCyclingScore(currentWeather);
    contextLines.push(
      `Right now at the user's location: ${Math.round(currentWeather.tempF)}°F (feels like ${Math.round(currentWeather.feelsLikeF)}°F), ${Math.round(currentWeather.windSpeedMph)} mph wind, humidity ${currentWeather.humidity}%, ${currentWeather.condition}. Ride Score ${score.score.toFixed(1)} (${score.label}).`
    );
  }

  if (forecast.length > 0) {
    const window = findBestRideWindow(forecast);
    if (window) {
      const day = window.startsTomorrow ? "Tomorrow" : "Today";
      contextLines.push(
        `Best upcoming 2-hour window: ${day} ${fmtHour12(window.startHourLocal)}–${fmtHour12(window.endHourLocal)}, score ${window.avgScore.toFixed(1)} (${window.scoreLabel}), ${Math.round(window.weather.tempF)}°F.`
      );
    }
    // Sample every 6 hours so the model can answer "what about 7am tomorrow"
    // without us shipping 36 lines of forecast.
    const samples: string[] = [];
    for (const i of [0, 3, 6, 9, 12, 18, 24, 30]) {
      const slot = forecast[i];
      if (!slot) continue;
      const s = computeCyclingScore(slot.weather);
      const t = slot.timestamp;
      // Treat the local-stringified timestamp as already-local (timezone=auto)
      const hour = t.getUTCHours();
      const day = t.getUTCDate() === forecast[0].timestamp.getUTCDate() ? "today" : "tomorrow";
      samples.push(
        `${day} ${fmtHour12(hour)}: ${Math.round(slot.weather.tempF)}°F, ${Math.round(slot.weather.windSpeedMph)} mph ${slot.weather.condition}, score ${s.score.toFixed(1)}`
      );
    }
    if (samples.length > 0) contextLines.push(`Forecast samples — ${samples.join(" | ")}.`);
  }

  if (spots.length > 0) {
    contextLines.push(
      `User's saved ride spots: ${spots.map((s) => `${s.name}${s.locationName ? ` (${s.locationName})` : ""}`).join("; ")}.`
    );
  }

  const contextBlock =
    contextLines.length > 0
      ? `<context>\n${contextLines.join("\n")}\n</context>\n\n`
      : "";

  const client = new Anthropic();

  // Build messages. History first, then current question with context prefix.
  const messages: Anthropic.MessageParam[] = [];
  if (history) {
    for (const turn of history) {
      messages.push({ role: turn.role, content: turn.content });
    }
  }
  messages.push({ role: "user", content: `${contextBlock}${question}` });

  // Stream the response back as plain text — simplest possible format the
  // browser can render incrementally. Cache the system prompt so repeat
  // questions from the same user pay ~0.1× input price on prefix tokens.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const messageStream = client.messages.stream({
          model: "claude-opus-4-7",
          max_tokens: 1024,
          system: [
            {
              type: "text",
              text: SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages,
        });

        for await (const event of messageStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "AI request failed";
        controller.enqueue(encoder.encode(`\n\n[Error: ${msg}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}

function fmtHour12(h: number): string {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}
