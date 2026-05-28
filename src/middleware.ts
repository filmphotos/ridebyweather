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
  // Device pairing: the device has no user cookie. /code issues a code,
  // /poll exchanges the secret for a token, /qr renders the QR image.
  // (/api/device/approve is intentionally NOT public — it needs the logged-in user.)
  "/api/device/code",
  "/api/device/poll",
  "/api/device/qr",
];

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PAGES.has(pathname)) return NextResponse.next();
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
