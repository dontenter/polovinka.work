import { NextRequest, NextResponse } from "next/server";
import { assessorAuthorized } from "@/lib/assessor-auth";
import { syncAssessorGames } from "@/lib/assessor-import";
import { claimAssessorSync, releaseAssessorSync } from "@/lib/assessor-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  if (!(await assessorAuthorized(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let claim: Awaited<ReturnType<typeof claimAssessorSync>>["claim"] = null;
  try {
    const attempt = await claimAssessorSync();
    claim = attempt.claim;
    if (!claim) return NextResponse.json({ status: "recent", nextCheckAt: attempt.nextCheckAt });
    const result = await syncAssessorGames(claim.claimedAt);
    return NextResponse.json({ status: "updated", ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (claim) {
      try { await releaseAssessorSync(claim); }
      catch (releaseError) { console.error("Assessor sync release failed:", releaseError); }
    }
    console.error("Assessor sync failed:", error);
    return NextResponse.json({ error: "Could not check for new games" }, { status: 500 });
  }
}
