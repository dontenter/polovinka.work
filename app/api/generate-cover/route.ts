import { NextRequest, NextResponse } from "next/server";

const NANOBANANA_BASE = "https://api.nanobananaapi.ai/api/v1/nanobanana";
const COVER_PROMPT =
  "Professional game cover art, high quality, based on the game icon. Expand the scene into a full cover image, keep the same style and mood. No text, no logos.";

export type ImageSize = "16:9" | "9:16";

export async function POST(request: NextRequest) {
  const apiKey = process.env.NANOBANANA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "NANOBANANA_API_KEY is not configured" },
      { status: 500 }
    );
  }

  let body: { iconUrl: string; image_size: ImageSize };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { iconUrl, image_size } = body;
  if (!iconUrl || typeof iconUrl !== "string") {
    return NextResponse.json(
      { error: "iconUrl is required and must be a string" },
      { status: 400 }
    );
  }
  if (!image_size || !["16:9", "9:16"].includes(image_size)) {
    return NextResponse.json(
      { error: "image_size must be 16:9 or 9:16" },
      { status: 400 }
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
  const callBackUrl = `${baseUrl}/api/generate-cover/callback`;

  const res = await fetch(`${NANOBANANA_BASE}/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: COVER_PROMPT,
      type: "IMAGETOIAMGE",
      imageUrls: [iconUrl],
      image_size,
      numImages: 1,
      callBackUrl,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error("[generate-cover] Nano Banana /generate failed:", res.status, data);
    return NextResponse.json(
      { error: data.msg || "Nano Banana request failed", details: data },
      { status: res.status >= 500 ? 502 : 400 }
    );
  }

  if (data.code !== 200 || !data.data?.taskId) {
    console.error("[generate-cover] Task not created:", data);
    return NextResponse.json(
      { error: data.msg || "Failed to create task", details: data },
      { status: 400 }
    );
  }

  console.log("[generate-cover] Task created:", data.data.taskId, "iconUrl:", iconUrl.slice(0, 80) + (iconUrl.length > 80 ? "…" : ""));
  return NextResponse.json({ taskId: data.data.taskId });
}
