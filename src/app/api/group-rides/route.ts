import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";

const CreateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  sport: z.enum(["cycling", "running", "walking"]).default("cycling"),
  startTime: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid startTime"),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  locationName: z.string().min(1).max(200),
  pace: z.string().max(40).optional().nullable(),
  distanceMi: z.number().min(0).max(500).optional().nullable(),
  maxRiders: z.number().int().min(2).max(500).optional().nullable(),
  visibility: z.enum(["public", "unlisted"]).default("public"),
});

async function getPayload(req: NextRequest) {
  const token = req.cookies.get("rbw_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  const payload = await getPayload(req);
  const url = req.nextUrl;
  const scope = url.searchParams.get("scope"); // "mine" | "upcoming" (default)
  const sport = url.searchParams.get("sport"); // "cycling" | "running"

  const where: Record<string, unknown> = {};

  if (scope === "mine") {
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    where.OR = [
      { creatorId: payload.userId },
      { participants: { some: { userId: payload.userId } } },
    ];
  } else {
    where.visibility = "public";
    where.startTime = { gte: new Date() };
  }

  if (sport === "cycling" || sport === "running" || sport === "walking") {
    where.sport = sport;
  }

  const rides = await db.groupRide.findMany({
    where,
    orderBy: { startTime: "asc" },
    take: 100,
    include: {
      creator: { select: { id: true, name: true, email: true } },
      _count: { select: { participants: true } },
      ...(payload
        ? {
            participants: {
              where: { userId: payload.userId },
              select: { status: true },
            },
          }
        : {}),
    },
  });

  return NextResponse.json({
    rides: rides.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      sport: r.sport,
      startTime: r.startTime,
      lat: r.lat,
      lng: r.lng,
      locationName: r.locationName,
      pace: r.pace,
      distanceMi: r.distanceMi,
      maxRiders: r.maxRiders,
      visibility: r.visibility,
      creator: r.creator,
      participantCount: r._count.participants,
      myRsvp: r.participants?.[0]?.status ?? null,
      isCreator: payload ? r.creatorId === payload.userId : false,
    })),
  });
}

export async function POST(req: NextRequest) {
  const payload = await getPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const startTime = new Date(data.startTime);
  if (startTime.getTime() < Date.now() - 5 * 60 * 1000) {
    return NextResponse.json({ error: "startTime must be in the future" }, { status: 400 });
  }

  const ride = await db.groupRide.create({
    data: {
      creatorId: payload.userId,
      name: data.name,
      description: data.description ?? null,
      sport: data.sport,
      startTime,
      lat: data.lat,
      lng: data.lng,
      locationName: data.locationName,
      pace: data.pace ?? null,
      distanceMi: data.distanceMi ?? null,
      maxRiders: data.maxRiders ?? null,
      visibility: data.visibility,
      participants: {
        create: { userId: payload.userId, status: "going" },
      },
    },
  });

  return NextResponse.json({ ride }, { status: 201 });
}
