import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { exchangeStravaCode } from "@/lib/strava";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.redirect(new URL("/login", req.url));

  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/settings?strava=denied", req.url));
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const redirectUri = `${appUrl}/api/strava/callback`;
    const tokens = await exchangeStravaCode(code, redirectUri);

    await db.deviceIntegration.upsert({
      where: { userId_provider: { userId: payload.userId, provider: "strava" } },
      create: {
        userId: payload.userId,
        provider: "strava",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? null,
        expiresAt: tokens.expiresAt,
        scopes: JSON.stringify(tokens.scopes),
        metadata: JSON.stringify({
          athleteId: tokens.athleteId,
          athleteName: tokens.athleteName,
        }),
      },
      update: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? null,
        expiresAt: tokens.expiresAt,
        scopes: JSON.stringify(tokens.scopes),
        metadata: JSON.stringify({
          athleteId: tokens.athleteId,
          athleteName: tokens.athleteName,
        }),
      },
    });

    return NextResponse.redirect(new URL("/settings?strava=connected", req.url));
  } catch (err) {
    console.error("Strava callback error:", err);
    return NextResponse.redirect(new URL("/settings?strava=error", req.url));
  }
}
