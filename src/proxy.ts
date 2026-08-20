import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

/**
 * Edge-level gate (Next.js `proxy` convention). It only verifies the session token's signature and expiry —
 * it cannot reach MongoDB — so every API route still performs the full
 * authorisation check. This exists to route users, not to enforce security.
 */
const PUBLIC_PATHS = ["/login"];
const PUBLIC_API_PREFIXES = ["/api/auth/login", "/api/auth/logout"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (pathname.startsWith("/api")) {
    if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return NextResponse.next();
    }
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Authentication required", errors: [] },
        { status: 401 },
      );
    }
    return NextResponse.next();
  }

  const isPublicPage = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!session && !isPublicPage) {
    const loginUrl = new URL("/login", request.url);
    // Preserve where the user was heading so they land there after signing in.
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (session && isPublicPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except Next.js internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
