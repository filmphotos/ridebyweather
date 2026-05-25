import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWeatherProvider } from "@/lib/weather";
import { computeCyclingScore } from "@/lib/ride-score";
import { computeRunScore } from "@/lib/run-score";

const UpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  startTime: z.string().refine((v) => !Number.isNaN(Date.parse(v))).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  locationName: z.string().min(1).max(200).optional(),
  pace: z.string().max(40).nullable().optional(),
  distanceMi: z.number().min(0).max(500).nullable().optional(),
  maxRiders: z.number().int().min(2).max(500).nullable().optional(),
  visibility: z.enum(["public", "unlisted"]).optional(),
});

async function getPayload(req: NextRequest) {
  const token = req.cookies.get("rbw_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const payload = await getPayload(req);

  const ride = await db.groupRide.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      participants: {
        orderBy: { joinedAt: "asc" },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  if (!ride) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (ride.visibility !== "public" && (!payload || (
    ride.creatorId !== payload.userId &&
    !ride.participants.some((p) => p.userId === payload.userId)
  ))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Best-effort ride-score for the start time — pick the nearest hourly forecast hour
  let forecastScore: {
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
  } | null = null;

  try {
    const provider = getWeatherProvider();
    const hoursAhead = Math.max(
      1,
      Math.min(47, Math.ceil((ride.startTime.getTime() - Date.now()) / 3_600_000) + 1)
    );
    const hourly = await provider.getHourlyForecast({ lat: ride.lat, lng: ride.lng }, hoursAhead);
    let best = hourly[0];
    let bestDelta = Number.POSITIVE_INFINITY;
    for (const h of hourly) {
      const delta = Math.abs(h.timestamp.getTime() - ride.startTime.getTime());
      if (delta < bestDelta) {
        bestDelta = delta;
        best = h;
      }
    }
    if (best) {
      const result =
        ride.sport === "running"
          ? computeRunScore(best.weather)
          : computeCyclingScore(best.weather);
      const color = "hexColor" in result ? result.hexColor : result.color;
      forecastScore = {
        score: result.score,
        label: result.label,
        color,
        weather: {
          tempF: best.weather.tempF,
          feelsLikeF: best.weather.feelsLikeF,
          windSpeedMph: best.weather.windSpeedMph,
          windGustMph: best.weather.windGustMph,
          windDirDeg: best.weather.windDirDeg,
          precipProb: best.weather.precipProb,
          humidity: best.weather.humidity,
          condition: best.weather.condition,
        },
      };
    }
  } catch {
    // forecast is best-effort
  }

  return NextResponse.json({
    ride: {
      id: ride.id,
      name: ride.name,
      description: ride.description,
      sport: ride.sport,
      startTime: ride.startTime,
      lat: ride.lat,
      lng: ride.lng,
      locationName: ride.locationName,
      pace: ride.pace,
      distanceMi: ride.distanceMi,
      maxRiders: ride.maxRiders,
      visibility: ride.visibility,
      inviteCode: ride.inviteCode,
      creator: ride.creator,
      participants: ride.participants.map((p) => ({
        userId: p.userId,
        name: p.user.name,
        email: p.user.email,
        status: p.status,
        joinedAt: p.joinedAt,
      })),
      isCreator: payload ? ride.creatorId === payload.userId : false,
      myRsvp: payload
        ? ride.participants.find((p) => p.userId === payload.userId)?.status ?? null
        : null,
    },
    forecastScore,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = await getPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ride = await db.groupRide.findUnique({ where: { id } });
  if (!ride || ride.creatorId !== payload.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const updated = await db.groupRide.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.startTime !== undefined && { startTime: new Date(data.startTime) }),
      ...(data.lat !== undefined && { lat: data.lat }),
      ...(data.lng !== undefined && { lng: data.lng }),
      ...(data.locationName !== undefined && { locationName: data.locationName }),
      ...(data.pace !== undefined && { pace: data.pace }),
      ...(data.distanceMi !== undefined && { distanceMi: data.distanceMi }),
      ...(data.maxRiders !== undefined && { maxRiders: data.maxRiders }),
      ...(data.visibility !== undefined && { visibility: data.visibility }),
    },
  });

  return NextResponse.json({ ride: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = await getPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ride = await db.groupRide.findUnique({ where: { id } });
  if (!ride || ride.creatorId !== payload.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.groupRide.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
