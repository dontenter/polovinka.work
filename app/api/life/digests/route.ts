import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { parseDigest, storeDigest, lifeStorageConfigured } from "@/lib/life-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  const secret = process.env.LIFE_INGEST_SECRET;
  const supplied = request.headers.get("authorization") ?? "";
  const expected = Buffer.from("Bearer " + secret);
  const received = Buffer.from(supplied);
  if (!secret || received.length !== expected.length ||
      !timingSafeEqual(received, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!lifeStorageConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }
  if (Number(request.headers.get("content-length")) > 150000) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  let digest;
  try {
    const body = await request.text();
    if (body.length > 150000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    digest = parseDigest(JSON.parse(body));
  } catch {
    return NextResponse.json({ error: "Invalid digest" }, { status: 400 });
  }
  try {
    await storeDigest(digest);
    return NextResponse.json({ id: digest.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not save digest; check storage or duplicate ID" }, { status: 502 });
  }
}
