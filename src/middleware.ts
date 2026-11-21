import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/auth", "/about", "/api/auth", "/api/recovery", "/i", "/api/cron", "/api/payments", "/pricing", "/advertise", "/api/assetlinks", "/.well-known", "/terms", "/privacy", "/refund"];

/**
 * Fast, optimistic redirect based on the presence of a session cookie. Every
 * page and API route still verifies the session against the database.
 */
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublic = path === "/" || PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
  const hasSession = Boolean(getSessionCookie(request));

  if (!hasSession && !isPublic) {
    if (path.startsWith("/api/")) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|sw.js|manifest.webmanifest|offline.html|icons/|voice-samples/|\\.well-known/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
