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
const EXPECTED_SIZE = 800;

export async function POST(request: NextRequest) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        error:
          "Upload is not configured. Set BLOB_READ_WRITE_TOKEN or use an image URL instead.",
      },
      { status: 503 }
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file") ?? formData?.get("icon");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing file. Send as form field 'file' or 'icon'." },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      {
        error: `Invalid type. Allowed: jpg, jpeg, png, webp, avif, svg. Got: ${file.type}`,
      },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `File too large. Max ${MAX_SIZE / 1024 / 1024}MB.` },
      { status: 400 }
    );
  }

  // Vercel Blob REST API (no @vercel/blob dependency at build time)
  const ext =
    file.name.split(".").pop()?.toLowerCase() ||
    (file.type === "image/svg+xml" ? "svg" : "png");
  const pathname = `icons/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const baseUrl = process.env.VERCEL_BLOB_API_URL ?? "https://vercel.com/api/blob";
  const res = await fetch(`${baseUrl}/?${new URLSearchParams({ pathname }).toString()}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "x-vercel-blob-access": "public",
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: `Upload failed: ${err || res.statusText}` },
      { status: res.status >= 500 ? 502 : 400 }
    );
  }

  const data = (await res.json()) as { url?: string };
  if (!data?.url) {
    return NextResponse.json(
      { error: "Upload succeeded but no URL returned" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    url: data.url,
    expectedSize: EXPECTED_SIZE,
    message: "Icon should be 800×800 for best results.",
  });
}

export async function DELETE(request: NextRequest) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const url = request.nextUrl.searchParams.get("url");
  if (!token || !url) return NextResponse.json({ ok: false }, { status: 400 });
  const baseUrl = process.env.VERCEL_BLOB_API_URL ?? "https://vercel.com/api/blob";
  const res = await fetch(`${baseUrl.replace(/\/?$/, "")}/delete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ urls: [url] }),
  });
  if (!res.ok) return NextResponse.json({ ok: false }, { status: 400 });
  return NextResponse.json({ ok: true });
}
