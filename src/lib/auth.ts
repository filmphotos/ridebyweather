import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev_jwt_secret_change_me_in_production_32chars"
);

export interface TokenPayload {
  userId: string;
  email: string;
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Extracts the auth token from a request, supporting both the web cookie
 * ("rbw_token") and a mobile/wearable "Authorization: Bearer <token>" header.
 * Returns the raw token string, or null if none present.
 */
export function getTokenFromRequest(req: NextRequest): string | null {
  const cookieToken = req.cookies.get("rbw_token")?.value;
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim() || null;
  }
  return null;
}

/**
 * Convenience: extract + verify in one step. Returns the payload or null.
 */
export async function getAuthPayload(req: NextRequest): Promise<TokenPayload | null> {
  const token = getTokenFromRequest(req);
  return token ? verifyToken(token) : null;
}
