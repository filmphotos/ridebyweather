import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const PrefsSchema = z.object({
  preferredUnit: z.enum(["imperial", "metric"]).optional(),
  sport: z.enum(["cycling", "running"]).optional(),
  ebikeMode: z.boolean().optional(),
  preferCold: z.boolean().optional(),
  dislikeWind: z.boolean().optional(),
  temperatureMin: z.number().nullable().optional(),
  temperatureMax: z.number().nullable().optional(),
  weightLb: z.number().positive().max(1000).nullable().optional(),
});

async function getUser(req: NextRequest) {
  const token = req.cookies.get("rbw_token")?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  return payload;
}

export async function GET(req: NextRequest) {
  const payload = await getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prefs = await db.userPreferences.findUnique({
    where: { userId: payload.userId },
  });

  if (!prefs) {
    return NextResponse.json({
      preferredUnit: "imperial",
      sport: "cycling",
      ebikeMode: false,
      preferCold: false,
      dislikeWind: false,
      temperatureMin: null,
      temperatureMax: null,
      weightLb: null,
    });
  }

  return NextResponse.json(prefs);
}

export async function PUT(req: NextRequest) {
  const payload = await getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = PrefsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const prefs = await db.userPreferences.upsert({
    where: { userId: payload.userId },
    create: { userId: payload.userId, ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json(prefs);
}
