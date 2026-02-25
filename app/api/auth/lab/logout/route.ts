import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth-lab";

export async function POST(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/lab/login", request.url));
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return res;
}
