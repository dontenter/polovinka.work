import { NextRequest, NextResponse } from "next/server";
import { assessorAuthorized } from "@/lib/assessor-auth";
import { listGames, type AssessorStatus } from "@/lib/assessor-storage";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await assessorAuthorized(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = request.nextUrl.searchParams;
  const status = params.get("status") ?? "pending";
  if (!["pending", "clear", "flagged", "unavailable"].includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const page = Math.max(1, Math.min(10000, Number(params.get("page")) || 1));
  try {
    const result = await listGames(status as AssessorStatus, params.get("search")?.trim() ?? "", page);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Assessor list failed:", error);
    return NextResponse.json({ error: "Could not load games" }, { status: 500 });
  }
}
