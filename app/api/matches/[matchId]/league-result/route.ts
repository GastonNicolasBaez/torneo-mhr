import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentPlayer } from "@/lib/session";
import { finishLeagueSession } from "@/lib/league";

/**
 * POST /api/matches/[matchId]/league-result
 * Body: { winner: "p1" | "p2" | "draw" }
 *
 * Designed for inline result entry in the league page.
 * Sets the match to finished in one step and auto-closes the session if all matches are done.
 * The match must belong to a GameSession (league match) and have exactly 2 stub MatchResults.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const currentPlayer = await getCurrentPlayer();
  if (!currentPlayer) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { winner } = await request.json(); // "p1" | "p2" | "draw"
  if (!winner || !["p1", "p2", "draw"].includes(winner)) {
    return NextResponse.json({ error: "winner must be p1, p2, or draw" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (!match.gameSessionId) {
    return NextResponse.json({ error: "Not a league match" }, { status: 400 });
  }
  if (match.status === "finished" || match.status === "cancelled") {
    return NextResponse.json({ error: "Match already closed" }, { status: 400 });
  }

  // Get the two stub results to know who is p1 and p2
  const results = await prisma.matchResult.findMany({ where: { matchId } });
  if (results.length !== 2) {
    return NextResponse.json({ error: "Expected exactly 2 players" }, { status: 400 });
  }

  const [r1, r2] = results;
  let p1Placement: number;
  let p2Placement: number;
  let winnerId: string | null = null;

  if (winner === "draw") {
    p1Placement = 1;
    p2Placement = 1;
  } else if (winner === "p1") {
    p1Placement = 1;
    p2Placement = 2;
    winnerId = r1.playerId;
  } else {
    p1Placement = 2;
    p2Placement = 1;
    winnerId = r2.playerId;
  }

  // Update placements on the existing stub results
  await Promise.all([
    prisma.matchResult.update({
      where: { id: r1.id },
      data: { placement: p1Placement, isConfirmed: true, confirmedAt: new Date() },
    }),
    prisma.matchResult.update({
      where: { id: r2.id },
      data: { placement: p2Placement, isConfirmed: true, confirmedAt: new Date() },
    }),
  ]);

  // Mark match as finished
  await prisma.match.update({
    where: { id: matchId },
    data: {
      status: "finished",
      finishedAt: new Date(),
      startedAt: match.startedAt ?? new Date(),
      winnerId,
    },
  });

  // Check if all matches in the session are done → auto-finish
  const sessionMatches = await prisma.match.findMany({
    where: { gameSessionId: match.gameSessionId },
    select: { status: true },
  });
  const allDone = sessionMatches.every(
    (m) => m.status === "finished" || m.status === "cancelled"
  );
  if (allDone) {
    await finishLeagueSession(match.gameSessionId);
  }

  return NextResponse.json({ status: "finished", allDone });
}
