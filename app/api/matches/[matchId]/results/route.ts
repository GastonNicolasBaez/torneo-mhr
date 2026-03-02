import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentPlayer } from "@/lib/session";
import { logAudit } from "@/lib/audit";

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

  // Delete existing results for this match (allow resubmission)
  await prisma.matchResult.deleteMany({ where: { matchId } });

  // Create new results
  const created = await prisma.matchResult.createMany({
    data: results.map((r: { playerId: string; placement: number; tournamentPoints: number; gameScore?: number; teamId?: string }) => ({
      matchId,
      playerId: r.playerId,
      placement: r.placement,
      tournamentPoints: isLeagueMatch ? 0 : r.tournamentPoints,
      gameScore: r.gameScore,
      teamId: r.teamId,
    })),
  });

  // Advance match to pending_validation
  await prisma.match.update({
    where: { id: matchId },
    data: { status: "pending_validation" },
  });

  await logAudit(matchId, "RESULT_SUBMITTED", currentPlayer.id, { results });

  return NextResponse.json({ created }, { status: 201 });
}
