import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createLabSession, COOKIE_NAME } from "@/lib/auth-lab";

const LAB_PASSWORD_HASH = process.env.LAB_PASSWORD_HASH;
const LAB_PASSWORD_SALT = process.env.LAB_PASSWORD_SALT;
const LAB_SECRET = process.env.LAB_SECRET;

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const hash = createHash("sha256").update(salt + password).digest("hex");
  return hash === expectedHash;
}

export async function POST(request: NextRequest) {
  if (!LAB_PASSWORD_HASH || !LAB_PASSWORD_SALT || !LAB_SECRET) {
    return NextResponse.json(
      { error: "Lab auth is not configured" },
      { status: 500 }
    );
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid body" },
      { status: 400 }
    );
  }

  if (
    typeof body.password !== "string" ||
    !verifyPassword(body.password, LAB_PASSWORD_SALT, LAB_PASSWORD_HASH)
  ) {
    return NextResponse.json(
      { error: "Invalid password" },
      { status: 401 }
    );
  }

  const token = await createLabSession(LAB_SECRET);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  });
  return res;
}
