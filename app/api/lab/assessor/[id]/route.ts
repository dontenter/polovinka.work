import { NextRequest, NextResponse } from "next/server";
import { assessorAuthorized } from "@/lib/assessor-auth";
import { getGame, reviewGame, setGameFavourite, type AssessorStatus } from "@/lib/assessor-storage";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await assessorAuthorized(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!/^[a-z0-9]{10}$/.test(id)) return NextResponse.json({ error: "Invalid game" }, { status: 400 });
  let body: { status?: AssessorStatus; reason?: string; favourite?: boolean };
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object") throw new Error("Invalid body");
    body = parsed as typeof body;
  }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const hasStatus = Object.prototype.hasOwnProperty.call(body, "status");
  const hasFavourite = Object.prototype.hasOwnProperty.call(body, "favourite");
  const status = body.status;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (hasStatus === hasFavourite ||
      (hasStatus && (!status || !["pending", "clear", "flagged", "unavailable"].includes(status) || reason.length > 2000)) ||
      (hasFavourite && typeof body.favourite !== "boolean")) {
    return NextResponse.json({ error: "Invalid game update" }, { status: 400 });
  }
  try {
    if (!(await getGame(id))) return NextResponse.json({ error: "Game not found" }, { status: 404 });
    if (hasStatus && status) await reviewGame(id, status, reason);
    if (hasFavourite) await setGameFavourite(id, body.favourite as boolean);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Assessor game update failed:", error);
    return NextResponse.json({ error: "Could not save game update" }, { status: 500 });
  }
}
