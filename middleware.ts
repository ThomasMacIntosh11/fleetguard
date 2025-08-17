import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // Only guard /app
  if (!req.nextUrl.pathname.startsWith("/app")) return NextResponse.next();

  const session = req.cookies.get("fg_session")?.value;
  if (session === "1") return NextResponse.next();

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/app/:path*"],
};