import { NextRequest, NextResponse } from "next/server";
import { verifyLabSession, COOKIE_NAME } from "@/lib/auth-lab";

import { verifyLifeSession, COOKIE_NAME as LIFE_COOKIE } from "@/lib/auth-life";

const LAB_SECRET = process.env.LAB_SECRET;

function addNoindexHeader(response: NextResponse): NextResponse {
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Life is separate from Lab and always fails closed.
  if (pathname === "/life" || pathname.startsWith("/life/")) {
    const response = addNoindexHeader(NextResponse.next());
    response.headers.set("Cache-Control", "private, no-store");
    if (pathname === "/life/login") return response;
    const secret = process.env.LIFE_SECRET;
    const token = request.cookies.get(LIFE_COOKIE)?.value;
    if (!secret || !process.env.LIFE_PASSWORD_HASH || !process.env.LIFE_PASSWORD_SALT ||
        !token || !(await verifyLifeSession(secret, token))) {
      const login = new URL("/life/login", request.url);
      login.searchParams.set("from", pathname + request.nextUrl.search);
      return addNoindexHeader(NextResponse.redirect(login));
    }
    return response;
  }
  // Protect /lab but allow /lab/login and API auth
  if (!pathname.startsWith("/lab")) {
    return NextResponse.next();
  }
  if (pathname === "/lab/login") {
    return addNoindexHeader(NextResponse.next());
  }

  if (!LAB_SECRET) {
    // No secret configured: allow access (auth disabled)
    return addNoindexHeader(NextResponse.next());
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    const login = new URL("/lab/login", request.url);
    login.searchParams.set("from", pathname);
    return addNoindexHeader(NextResponse.redirect(login));
  }

  const valid = await verifyLabSession(LAB_SECRET, token);
  if (!valid) {
    const login = new URL("/lab/login", request.url);
    login.searchParams.set("from", pathname);
    const res = NextResponse.redirect(login);
    res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
    return addNoindexHeader(res);
  }

  return addNoindexHeader(NextResponse.next());
}

export const config = {
  matcher: ["/lab", "/lab/:path*", "/life", "/life/:path*"],
};
