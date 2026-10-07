import { NextRequest, NextResponse } from "next/server";
import { assessorAuthorized } from "@/lib/assessor-auth";
import { resolveLaunchUrl } from "@/lib/assessor-import";
import { getGame } from "@/lib/assessor-storage";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await assessorAuthorized(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!/^[a-z0-9]{10}$/.test(id)) return NextResponse.json({ error: "Invalid game" }, { status: 400 });
  try {
    if (!(await getGame(id))) return NextResponse.json({ error: "Game not found" }, { status: 404 });
    return NextResponse.json({ url: await resolveLaunchUrl(id) }, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (error) {
    console.error("Assessor game launch failed:", error);
    return NextResponse.json({ error: "Could not load this game" }, { status: 502 });
  }
}
