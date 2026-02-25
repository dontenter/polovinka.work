import { NextRequest, NextResponse } from "next/server";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/svg+xml",
];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

function getExtFromContentType(contentType: string | null): string {
  if (!contentType) return "png";
  const lower = contentType.split(";")[0].trim().toLowerCase();
  if (lower.includes("jpeg") || lower.includes("jpg")) return "jpg";
  if (lower.includes("png")) return "png";
  if (lower.includes("webp")) return "webp";
  if (lower.includes("avif")) return "avif";
  if (lower.includes("svg")) return "svg";
  return "png";
}

export async function POST(request: NextRequest) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Upload is not configured. Set BLOB_READ_WRITE_TOKEN." },
      { status: 503 }
    );
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawUrl = body?.url;
  if (!rawUrl || typeof rawUrl !== "string") {
    return NextResponse.json(
      { error: "url is required and must be a string" },
      { status: 400 }
    );
  }

  const url = rawUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json(
      { error: "URL must be http or https" },
      { status: 400 }
    );
  }

  const imageRes = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "image/jpeg,image/png,image/webp,image/avif,image/svg+xml,*/*",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!imageRes.ok) {
    return NextResponse.json(
      {
        error: `Failed to fetch image: ${imageRes.status} ${imageRes.statusText}. The host may block server requests — try uploading the file instead.`,
      },
      { status: 400 }
    );
  }

  const contentType = imageRes.headers.get("content-type") ?? null;
  const contentTypeBase = contentType?.split(";")[0].trim().toLowerCase() ?? "";
  const isAllowedType =
    ALLOWED_TYPES.some((t) => t === contentTypeBase) ||
    contentTypeBase === "image/svg+xml";
  if (contentTypeBase.startsWith("image/") && !isAllowedType) {
    return NextResponse.json(
      {
        error: `Unsupported image type. Allowed: jpg, png, webp, avif, svg. Got: ${contentType ?? "unknown"}`,
      },
      { status: 400 }
    );
  }

  const buffer = await imageRes.arrayBuffer();
  if (buffer.byteLength > MAX_SIZE) {
    return NextResponse.json(
      { error: `Image too large. Max ${MAX_SIZE / 1024 / 1024}MB.` },
      { status: 400 }
    );
  }

  const ext = getExtFromContentType(contentType);
  const pathname = `icon-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const baseUrl = process.env.VERCEL_BLOB_API_URL ?? "https://vercel.com/api/blob";
  const blobRes = await fetch(
    `${baseUrl}/?${new URLSearchParams({ pathname }).toString()}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-vercel-blob-access": "public",
        "Content-Type": contentType ?? "image/png",
      },
      body: buffer,
    }
  );

  if (!blobRes.ok) {
    const err = await blobRes.text();
    return NextResponse.json(
      { error: `Upload failed: ${err || blobRes.statusText}` },
      { status: blobRes.status >= 500 ? 502 : 400 }
    );
  }

  const data = (await blobRes.json()) as { url?: string };
  if (!data?.url) {
    return NextResponse.json(
      { error: "Upload succeeded but no URL returned" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    url: data.url,
    message: "Icon fetched and uploaded. Use 800×800 for best results.",
  });
}
