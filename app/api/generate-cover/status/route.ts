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
    console.error("[generate-cover/status] Nano Banana request failed:", res.status, data);
    return NextResponse.json(
      { error: data.msg || "Failed to get task status", debug: data },
      { status: res.status >= 500 ? 502 : 400 }
    );
  }

  // Nano Banana returns { code, msg, data: { successFlag, response, ... } }
  const record = data.data ?? data;
  const successFlag = record.successFlag;
  const response = record.response || {};
  const resultImageUrl = response.resultImageUrl ?? null;
  const errorMessage =
    record.errorMessage ??
    record.msg ??
    data.msg ??
    record.message ??
    response?.message ??
    (typeof record.error === "string" ? record.error : null);

  if (successFlag !== 0 && successFlag !== 1) {
    console.error("[generate-cover/status] Task failed:", taskId, "response:", JSON.stringify(data));
  }

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
    debug:
      successFlag !== 0 && successFlag !== 1
        ? { raw: data }
        : undefined,
  });
}
