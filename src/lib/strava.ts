const STRAVA_BASE = "https://www.strava.com/api/v3";
const STRAVA_OAUTH_BASE = "https://www.strava.com/oauth";

export interface StravaTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scopes: string[];
  athleteId?: number;
  athleteName?: string;
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  distance: number; // meters
  start_date: string;
  elapsed_time: number; // seconds
  total_elevation_gain: number;
  map?: { summary_polyline?: string };
}

export function isStravaConfigured(): boolean {
  const id = process.env.STRAVA_CLIENT_ID;
  return !!id && id !== "placeholder";
}

export function getStravaAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read",
  });
  return `${STRAVA_OAUTH_BASE}/authorize?${params}`;
}

export async function exchangeStravaCode(code: string, redirectUri: string): Promise<StravaTokens> {
  const res = await fetch(`${STRAVA_OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Strava token exchange failed: ${res.status}`);
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(data.expires_at * 1000),
    scopes: data.scope?.split(",") ?? [],
    athleteId: data.athlete?.id,
    athleteName: data.athlete ? `${data.athlete.firstname} ${data.athlete.lastname}`.trim() : undefined,
  };
}

export async function refreshStravaToken(refreshToken: string): Promise<StravaTokens> {
  const res = await fetch(`${STRAVA_OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Strava token refresh failed: ${res.status}`);
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(data.expires_at * 1000),
    scopes: [],
  };
}

export async function getStravaActivities(accessToken: string, perPage = 15): Promise<StravaActivity[]> {
  const res = await fetch(`${STRAVA_BASE}/athlete/activities?per_page=${perPage}&page=1`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Strava activities fetch failed: ${res.status}`);
  return res.json();
}

export async function getStravaActivityStreams(
  accessToken: string,
  activityId: number
): Promise<[number, number][]> {
  const res = await fetch(
    `${STRAVA_BASE}/activities/${activityId}/streams?keys=latlng&key_by_type=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Strava stream fetch failed: ${res.status}`);
  const data = await res.json();
  const latlngs: [number, number][] = data.latlng?.data ?? [];
  if (latlngs.length === 0) return [];

  // Downsample to max 200 points, swap [lat,lng] → [lng,lat] for GeoJSON
  const step = Math.max(1, Math.floor(latlngs.length / 200));
  const sampled: [number, number][] = [];
  for (let i = 0; i < latlngs.length; i += step) {
    const [lat, lng] = latlngs[i];
    sampled.push([lng, lat]);
  }
  // Always include the last point
  const [lastLat, lastLng] = latlngs[latlngs.length - 1];
  const lastPt: [number, number] = [lastLng, lastLat];
  if (sampled[sampled.length - 1][0] !== lastPt[0] || sampled[sampled.length - 1][1] !== lastPt[1]) {
    sampled.push(lastPt);
  }
  return sampled;
}

// Shared helper — call from API routes to get a valid (auto-refreshed) token
export async function getValidStravaToken(userId: string): Promise<string | null> {
  const { db } = await import("./db");
  const integration = await db.deviceIntegration.findUnique({
    where: { userId_provider: { userId, provider: "strava" } },
  });
  if (!integration) return null;

  let accessToken = integration.accessToken;
  const fiveMinutes = 5 * 60 * 1000;
  const isExpiring = integration.expiresAt && integration.expiresAt < new Date(Date.now() + fiveMinutes);

  if (isExpiring) {
    if (!integration.refreshToken) return null;
    const fresh = await refreshStravaToken(integration.refreshToken);
    await db.deviceIntegration.update({
      where: { userId_provider: { userId, provider: "strava" } },
      data: {
        accessToken: fresh.accessToken,
        refreshToken: fresh.refreshToken,
        expiresAt: fresh.expiresAt,
      },
    });
    accessToken = fresh.accessToken;
  }

  return accessToken;
}

export function stravaTypeToSport(type: string): "cycling" | "running" {
  const runners = ["Run", "TrailRun", "Walk", "Hike", "VirtualRun"];
  return runners.includes(type) ? "running" : "cycling";
}

export function computeBearings(waypoints: [number, number][]): number[] {
  const bearings: number[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const [lng1, lat1] = waypoints[i];
    const [lng2, lat2] = waypoints[i + 1];
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const lat1R = (lat1 * Math.PI) / 180;
    const lat2R = (lat2 * Math.PI) / 180;
    const y = Math.sin(dLng) * Math.cos(lat2R);
    const x = Math.cos(lat1R) * Math.sin(lat2R) - Math.sin(lat1R) * Math.cos(lat2R) * Math.cos(dLng);
    bearings.push(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
  }
  return bearings;
}
