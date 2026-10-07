import "server-only";
import { NextRequest } from "next/server";
import { COOKIE_NAME, verifyLabSession } from "@/lib/auth-lab";

export async function assessorAuthorized(request: NextRequest): Promise<boolean> {
  const secret = process.env.LAB_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const token = request.cookies.get(COOKIE_NAME)?.value;
  return Boolean(token && await verifyLabSession(secret, token));
}
