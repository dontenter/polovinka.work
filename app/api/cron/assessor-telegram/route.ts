import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { deliverAssessorNotifications } from "@/lib/assessor-telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await deliverAssessorNotifications();
    return NextResponse.json(result, { status: result.status === "failed" ? 500 : 200, headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("Assessor Telegram queue unavailable");
    return NextResponse.json({ error: "Notification queue unavailable" }, { status: 500 });
  }
}
