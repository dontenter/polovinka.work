import { NextRequest, NextResponse } from "next/server";

const NANOBANANA_BASE = "https://api.nanobananaapi.ai/api/v1/nanobanana";

export async function GET(request: NextRequest) {
  const apiKey = process.env.NANOBANANA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "NANOBANANA_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const taskId = request.nextUrl.searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json(
      { error: "taskId is required" },
      { status: 400 }
    );
  }

  const res = await fetch(
    `${NANOBANANA_BASE}/record-info?taskId=${encodeURIComponent(taskId)}`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json(
      { error: data.msg || "Failed to get task status" },
      { status: res.status >= 500 ? 502 : 400 }
    );
  }

  const successFlag = data.successFlag;
  const response = data.response || {};
  const resultImageUrl = response.resultImageUrl ?? null;
  const errorMessage = data.errorMessage ?? null;

  return NextResponse.json({
    status:
      successFlag === 0
        ? "generating"
        : successFlag === 1
          ? "success"
          : "failed",
    successFlag,
    resultImageUrl,
    errorMessage,
  });
}
