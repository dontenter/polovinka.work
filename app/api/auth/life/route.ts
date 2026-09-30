import { lifeRequestOrigin } from "@/lib/life-origin";
import { scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { NextRequest, NextResponse } from "next/server";
import { createLifeSession, COOKIE_NAME } from "@/lib/auth-life";
const derive = promisify(scrypt);
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!lifeRequestOrigin(request.headers)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  const secret = process.env.LIFE_SECRET;
  const salt = process.env.LIFE_PASSWORD_SALT;
  const hash = process.env.LIFE_PASSWORD_HASH;
  if (!secret || !salt || !hash || !/^[a-f0-9]{128}$/.test(hash)) {
    return NextResponse.json({ error: "Life access is not configured" }, { status: 503 });
  }
  let password: unknown;
  try {
    const body = await request.text();
    if (body.length > 4096) throw new Error();
    password = JSON.parse(body).password;
    if (typeof password !== "string" || password.length > 1024) throw new Error();
  } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const actual = await derive(password as string, salt, 64) as Buffer;
  if (!timingSafeEqual(actual, Buffer.from(hash, "hex"))) {
    return NextResponse.json({ error: "Incorrect Life password" }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(COOKIE_NAME, await createLifeSession(secret), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 604800,
  });
  return response;
}
