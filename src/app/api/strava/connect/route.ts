import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { isStravaConfigured, getStravaAuthUrl } from "@/lib/strava";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.redirect(new URL("/login", req.url));

  if (!isStravaConfigured()) {
    return NextResponse.json({ error: "Strava not configured" }, { status: 503 });
  }

  const redirectUri = `${req.nextUrl.origin}/api/strava/callback`;
  return NextResponse.redirect(getStravaAuthUrl(redirectUri));
}
