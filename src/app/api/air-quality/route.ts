import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAirQuality } from "@/lib/airQuality";
import { getAuthPayload } from "@/lib/auth";

const QuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export async function GET(req: NextRequest) {
  const payload = await getAuthPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = QuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { lat, lng } = parsed.data;

  try {
    const air = await getAirQuality({ lat, lng });
    return NextResponse.json(air);
  } catch (err) {
    console.error("Air quality error:", err);
    return NextResponse.json({ error: "Failed to fetch air quality" }, { status: 500 });
  }
}
