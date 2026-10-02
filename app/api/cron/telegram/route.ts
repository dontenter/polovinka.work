import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runDailyDigest } from "@/lib/life-automation";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function GET(request: NextRequest) {
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET ?? ""}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  if (!process.env.CRON_SECRET || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (process.env.LIFE_AUTOMATION_ENABLED !== "true" || process.env.VERCEL_ENV !== "production") {
    return NextResponse.json({ status: "disabled" });
  }
  try { return NextResponse.json(await runDailyDigest(), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { console.error("Life daily digest failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Daily digest failed; inspect private run status" }, { status: 500 }); }
}
