import type { NextRequest } from "next/server";

// Absolute origin for building shareable links (watch pages, SOS emails).
// Prefers an explicit env override, else falls back to the request's origin.
export function appOrigin(req: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    req.nextUrl.origin
  );
}
