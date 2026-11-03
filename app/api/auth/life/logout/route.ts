import {lifeCookieDomain} from "@/lib/life-cookie";
import { lifeRequestOrigin } from "@/lib/life-origin";
import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth-life";
export async function POST(request: NextRequest) {
  if (!lifeRequestOrigin(request.headers)) return new NextResponse(null, { status: 403 });
  const response = NextResponse.redirect(new URL("/life/login", lifeRequestOrigin(request.headers)!), 303);
  response.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
  const domain=lifeCookieDomain(request.headers.get("host")??"");
  if(domain)response.headers.append("Set-Cookie", `${COOKIE_NAME}=; Domain=${domain}; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`);
  return response;
}
