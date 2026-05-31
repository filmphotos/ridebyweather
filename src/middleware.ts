import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

const PUBLIC_PAGES = new Set<string>([
  "/",
  "/login",
  "/signup",
  "/pricing",
  "/features",
  "/upgrade/success",
  "/admin/login",
  "/forgot-password",
  "/reset-password",
  // Device-pairing approval page (handles its own login inline).
  "/link",
]);

// Pages matched by prefix (dynamic segments). The live-ride "watch" page is
// intentionally public so family/friends without an account can follow along;
// the unguessable token in the URL is the access control.
// /guides is public editorial content (SEO).
const PUBLIC_PAGE_PREFIXES = ["/watch/", "/guides"];

const PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/me",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/admin/me",
  "/api/stripe/webhook",
  // Cron endpoint — authenticates with CRON_SECRET in the handler, no user cookie.
  "/api/push/check-storms",
  // Weekly digest cron — handler auths Bearer for cron, cookie for user preview.
  "/api/digest/weekly",
  // Device pairing: the device has no user cookie. /code issues a code,
  // /poll exchanges the secret for a token, /qr renders the QR image.
  // (/api/device/approve is intentionally NOT public — it needs the logged-in user.)
  "/api/device/code",
  "/api/device/poll",
  "/api/device/qr",
  // Static map image for devices — auth via ?token= (image requests can't
  // send an Authorization header); the handler verifies it.
  "/api/map",
  // Public read for a shared live ride — the watch token is the secret.
  // (Writes — /api/live/start and /api/live/ping — stay gated.)
  "/api/live/view",
];

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PAGES.has(pathname)) return NextResponse.next();
  if (PUBLIC_PAGE_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (pathname.startsWith("/api/") && isPublicApi(pathname)) {
    return NextResponse.next();
  }

  const token = getTokenFromRequest(req);
  const payload = token ? await verifyToken(token) : null;
  if (payload) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sitemap.xml|sw.js|offline.html|icons/|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.webp$|.*\\.gif$|.*\\.ico$).*)",
  ],
};
