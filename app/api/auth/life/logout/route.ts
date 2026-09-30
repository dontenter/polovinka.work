import { lifeRequestOrigin } from "@/lib/life-origin";
import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth-life";
export async function POST(request: NextRequest) {
  if (!lifeRequestOrigin(request.headers)) return new NextResponse(null, { status: 403 });
  const response = NextResponse.redirect(new URL("/life/login", lifeRequestOrigin(request.headers)!), 303);
  response.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return response;
}
