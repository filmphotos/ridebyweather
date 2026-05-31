import { db } from "./db";

export type Tier = "free" | "pro" | "enterprise";

// Free tier limits — surfaced in the UI so the paywall messaging matches
// the actual enforcement. Bump these here and the API + UI stay in sync.
export const FREE_LIMITS = {
  spots: 1,           // Multi-location "Where should I ride?" scanner
  routes: 3,          // Saved routes
  activeGroupRides: 1, // Group rides you're hosting
  forecastDays: 7,    // Daily Ride Score forecast
} as const;

export const PRO_LIMITS = {
  spots: 10,
  routes: Infinity,
  activeGroupRides: Infinity,
  forecastDays: 14,
} as const;

// Look up the user's billing tier. Missing rows = "free" (the user just
// hasn't ever opened the checkout flow). Cancelled subs are downgraded
// by the Stripe webhook so by the time we read here, tier reflects the
// effective access.
export async function getUserTier(userId: string): Promise<Tier> {
  const sub = await db.subscription.findUnique({
    where: { userId },
    select: { tier: true, status: true },
  });
  if (!sub) return "free";
  if (sub.status !== "active" && sub.status !== "trialing") return "free";
  const t = sub.tier;
  if (t === "pro" || t === "enterprise") return t;
  return "free";
}

export function isPro(tier: Tier): boolean {
  return tier === "pro" || tier === "enterprise";
}

export function limitsFor(tier: Tier) {
  return isPro(tier) ? PRO_LIMITS : FREE_LIMITS;
}

// API guard: returns null if the user has Pro access, or a 402 response if
// they don't. Caller passes the resolved tier so we don't double-query.
//
// Why 402 (Payment Required) instead of 403: 402 was reserved for this
// exact case in the original HTTP spec. Modern clients still treat it as
// "user is auth'd but needs to pay" which gives the front-end a clean
// signal to open the paywall modal rather than redirecting to login.
import { NextResponse } from "next/server";
export function requirePro(tier: Tier, feature: string): NextResponse | null {
  if (isPro(tier)) return null;
  return NextResponse.json(
    {
      error: "Pro plan required",
      feature,
      upgradeUrl: "/pricing",
    },
    { status: 402 }
  );
}
