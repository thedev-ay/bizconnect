import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ROUTE_SEGMENT_TO_MODULE } from "@/lib/module-registry";

export const proxy = auth(async (request) => {
  const { pathname } = request.nextUrl;
  const session = request.auth;

  // Pass through static assets, NextAuth routes, and API routes
  // API routes handle their own auth via authorize()
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    /\.[^/]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Extract tenant slug: /[tenant]/[module]/...
  const segments = pathname.split("/").filter(Boolean);
  const [tenantSlug, moduleSegment] = segments;

  // Root or no tenant — let the page handle it
  if (!tenantSlug) return NextResponse.next();

  // Allow login without auth
  if (moduleSegment === "login") return NextResponse.next();

  // Auth check
  if (!session) {
    return NextResponse.redirect(new URL(`/${tenantSlug}/login`, request.url));
  }

  // Tenant isolation
  if (session.user?.tenantSlug && session.user.tenantSlug !== tenantSlug) {
    return NextResponse.redirect(
      new URL(`/${session.user.tenantSlug}/dashboard`, request.url)
    );
  }

  // Module access guard — check session modules (set at login, no DB call needed)
  const moduleSlug = moduleSegment ? ROUTE_SEGMENT_TO_MODULE[moduleSegment] : undefined;
  if (moduleSlug) {
    const enabledModules = (session.user?.modules ?? []) as string[];
    if (!enabledModules.includes(moduleSlug)) {
      const url = new URL(`/${tenantSlug}/dashboard`, request.url);
      url.searchParams.set("error", "module_disabled");
      return NextResponse.redirect(url);
    }
  }

  const response = NextResponse.next();
  response.headers.set("x-tenant-slug", tenantSlug);
  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
