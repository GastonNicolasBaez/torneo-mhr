import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentPlayer } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { finishLeagueSession } from "@/lib/league";

export async function POST(request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const currentPlayer = await getCurrentPlayer();
  if (!currentPlayer) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const { results } = body; // Array of { playerId, placement, gameScore?, teamId? }

  if (!results?.length) return NextResponse.json({ error: "results required" }, { status: 400 });

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  // League sub-matches (part of a GameSession) always store 0 tournament points —
  // the real points are assigned when the session is closed via /finish.
  const isLeagueMatch = match.gameSessionId !== null;

  // Points by placement (used for FFA and enforced server-side)
  const FFA_POINTS: Record<number, number> = { 1: 4, 2: 3, 3: 2, 4: 1, 5: 0 };
  const calcPoints = (placement: number): number => FFA_POINTS[placement] ?? 0;

  // Delete existing results for this match (allow resubmission)
  await prisma.matchResult.deleteMany({ where: { matchId } });

  const isFFA = match.type === "ffa";
  const now = new Date();

  // Create new results
  const created = await prisma.matchResult.createMany({
    data: results.map((r: { playerId: string; placement: number; gameScore?: number; teamId?: string }) => ({
      matchId,
      playerId: r.playerId,
      placement: r.placement,
      // Always compute points server-side: 0 for league sub-matches, fixed scale for FFA
      tournamentPoints: isLeagueMatch ? 0 : calcPoints(r.placement),
      gameScore: r.gameScore,
      teamId: r.teamId,
      // FFA: auto-confirm all results immediately
      isConfirmed: isFFA,
      confirmedAt: isFFA ? now : null,
    })),
  });

  await logAudit(matchId, "RESULT_SUBMITTED", currentPlayer.id, { results });

  if (isFFA) {
    // FFA: skip VAR, finish immediately
    const winner = results.find((r: { placement: number }) => r.placement === 1);
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        status: "finished",
        finishedAt: now,
        winnerId: winner?.playerId,
      },
    });

    if (updatedMatch.gameSessionId) {
      const sessionMatches = await prisma.match.findMany({
        where: { gameSessionId: updatedMatch.gameSessionId },
        select: { status: true },
      });
      const allDone = sessionMatches.every(
        (m) => m.status === "finished" || m.status === "cancelled"
      );
      if (allDone) await finishLeagueSession(updatedMatch.gameSessionId);
    }
  } else {
    // Non-FFA: go through VAR confirmation flow
    await prisma.match.update({
      where: { id: matchId },
      data: { status: "pending_validation" },
    });
  }

  return NextResponse.json({ created }, { status: 201 });
}
