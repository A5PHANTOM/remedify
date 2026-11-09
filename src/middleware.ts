import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const sessionToken =
    request.cookies.get("__Secure-authjs.session-token")?.value ||
    request.cookies.get("authjs.session-token")?.value;

  const { pathname } = request.nextUrl;
  const isAuthPage = pathname.startsWith("/login");
  const isPublicAsset =
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/api/ics/") ||
    pathname === "/manifest.json" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/apple-touch-icon.png" ||
    pathname === "/favicon.ico";

  if (isPublicAsset) {
    return NextResponse.next();
  }

  // Unauthenticated user attempting to access protected route -> redirect to /login
  if (!sessionToken && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Already authenticated user visiting /login -> redirect to /
  if (sessionToken && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|manifest.json|apple-touch-icon.png|icons/).*)",
  ],
};
