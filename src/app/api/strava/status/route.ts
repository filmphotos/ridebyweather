import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { isStravaConfigured } from "@/lib/strava";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const configured = isStravaConfigured();

  const token = req.cookies.get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ configured, connected: false });

  const integration = await db.deviceIntegration.findUnique({
    where: { userId_provider: { userId: payload.userId, provider: "strava" } },
    select: { metadata: true, expiresAt: true },
  });

  if (!integration) return NextResponse.json({ configured, connected: false });

  const meta = integration.metadata ? JSON.parse(integration.metadata) : {};
  return NextResponse.json({
    configured,
    connected: true,
    athleteName: meta.athleteName ?? null,
    athleteId: meta.athleteId ?? null,
  });
}
