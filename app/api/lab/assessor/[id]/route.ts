import { after, NextRequest, NextResponse } from "next/server";
import { isAssessorGameId } from "@/lib/assessor-id";
import { assessorAuthorized } from "@/lib/assessor-auth";
import { reviewGame, setGameQuality, type AssessorStatus } from "@/lib/assessor-storage";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await assessorAuthorized(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!isAssessorGameId(id)) return NextResponse.json({ error: "Invalid game" }, { status: 400 });
  let body: { status?: AssessorStatus; reason?: string; favourite?: boolean; aiSlop?: boolean };
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object") throw new Error("Invalid body");
    body = parsed as typeof body;
  }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const hasStatus = Object.prototype.hasOwnProperty.call(body, "status");
  const hasFavourite = Object.prototype.hasOwnProperty.call(body, "favourite");
  const hasAiSlop = Object.prototype.hasOwnProperty.call(body, "aiSlop");
  const status = body.status;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (Number(hasStatus) + Number(hasFavourite) + Number(hasAiSlop) !== 1 ||
      (hasStatus && (!status || !["pending", "clear", "flagged", "unavailable"].includes(status) || reason.length > 2000)) ||
      (hasFavourite && typeof body.favourite !== "boolean") ||
      (hasAiSlop && typeof body.aiSlop !== "boolean")) {
    return NextResponse.json({ error: "Invalid game update" }, { status: 400 });
  }
  try {
    const updated = hasStatus && status
      ? await reviewGame(id, status, reason)
      : hasFavourite
        ? await setGameQuality(id, "favourite", body.favourite as boolean)
        : await setGameQuality(id, "aiSlop", body.aiSlop as boolean);
    if (!updated) return NextResponse.json({ error: "Game not found" }, { status: 404 });
    if (hasStatus && status === "flagged") after(async () => {
      try {
        const { deliverAssessorNotifications } = await import("@/lib/assessor-telegram");
        await deliverAssessorNotifications();
      } catch { console.error("Assessor Telegram background delivery unavailable; cron will retry"); }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Assessor game update failed:", error);
    return NextResponse.json({ error: "Could not save game update" }, { status: 500 });
  }
}
