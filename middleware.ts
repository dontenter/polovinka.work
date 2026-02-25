import { NextRequest, NextResponse } from "next/server";
import { verifyLabSession, COOKIE_NAME } from "@/lib/auth-lab";

const LAB_SECRET = process.env.LAB_SECRET;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /lab but allow /lab/login and API auth
  if (!pathname.startsWith("/lab")) {
    return NextResponse.next();
  }
  if (pathname === "/lab/login") {
    return NextResponse.next();
  }

  if (!LAB_SECRET) {
    // No secret configured: allow access (auth disabled)
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    const login = new URL("/lab/login", request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  const valid = await verifyLabSession(LAB_SECRET, token);
  if (!valid) {
    const login = new URL("/lab/login", request.url);
    login.searchParams.set("from", pathname);
    const res = NextResponse.redirect(login);
    res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/lab", "/lab/:path*"],
};
