import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;
  const session = request.auth;

  // Allow auth routes
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (!session?.user?.isSuperAdmin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
