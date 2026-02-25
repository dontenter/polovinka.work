import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";

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

  const ext =
    file.name.split(".").pop()?.toLowerCase() ||
    (file.type === "image/svg+xml" ? "svg" : "png");
  const filename = `icons/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const blob = await put(filename, file, {
    access: "public",
    token,
  });

  return NextResponse.json({
    url: blob.url,
    expectedSize: EXPECTED_SIZE,
    message: "Icon should be 800×800 for best results.",
  });
}

export async function DELETE(request: NextRequest) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const url = request.nextUrl.searchParams.get("url");
  if (!token || !url) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    await del(url, { token });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
