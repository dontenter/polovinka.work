import { NextRequest, NextResponse } from "next/server";
import { assessorAuthorized } from "@/lib/assessor-auth";
import { getGame, reviewGame, type AssessorStatus } from "@/lib/assessor-storage";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await assessorAuthorized(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!/^[a-z0-9]{10}$/.test(id)) return NextResponse.json({ error: "Invalid game" }, { status: 400 });
  let body: { status?: AssessorStatus; reason?: string };
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object") throw new Error("Invalid body");
    body = parsed as typeof body;
  }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const status = body.status;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!status || !["pending", "clear", "flagged", "unavailable"].includes(status) || reason.length > 2000 ||
      ((status === "flagged" || status === "unavailable") && !reason)) {
    return NextResponse.json({ error: "Укажите решение и причину" }, { status: 400 });
  }
  try {
    if (!(await getGame(id))) return NextResponse.json({ error: "Игра не найдена" }, { status: 404 });
    await reviewGame(id, status, reason);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Assessor review failed:", error);
    return NextResponse.json({ error: "Не удалось сохранить решение" }, { status: 500 });
  }
}
