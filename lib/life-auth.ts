import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, verifyLifeSession } from "@/lib/auth-life";

export async function requireLifeSession(path: string): Promise<void> {
  const secret = process.env.LIFE_SECRET;
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!secret || !process.env.LIFE_PASSWORD_HASH || !process.env.LIFE_PASSWORD_SALT) {
    redirect("/life/login?from=" + encodeURIComponent(path));
  }
  if (!token || !(await verifyLifeSession(secret, token))) {
    redirect("/life/login?from=" + encodeURIComponent(path));
  }
}
