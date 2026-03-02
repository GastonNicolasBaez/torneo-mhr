import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentPlayer } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { finishLeagueSession } from "@/lib/league";

export async function POST(request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const currentPlayer = await getCurrentPlayer();
  if (!currentPlayer) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { confirmed } = await request.json();

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  if (!confirmed) {
    // Dispute raised
    await prisma.match.update({
      where: { id: matchId },
      data: { status: "disputed" },
    });
    await logAudit(matchId, "DISPUTE_RAISED", currentPlayer.id, { reason: "Player rejected results" });
    return NextResponse.json({ status: "disputed" });
  }

  // Mark this player's results as confirmed
  await prisma.matchResult.updateMany({
    where: { matchId, playerId: currentPlayer.id },
    data: { isConfirmed: true, confirmedAt: new Date() },
  });

  await logAudit(matchId, "RESULT_CONFIRMED", currentPlayer.id, {});

  // Check if majority confirmed
  const allResults = await prisma.matchResult.findMany({ where: { matchId } });
  const uniquePlayers = [...new Set(allResults.map((r) => r.playerId))];
  const confirmedCount = allResults.filter((r) => r.isConfirmed).length;
  const majority = Math.floor(uniquePlayers.length / 2) + 1;

  if (confirmedCount >= majority) {
    // Find winner (placement 1)
    const winner = allResults.find((r) => r.placement === 1);
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        status: "finished",
        finishedAt: new Date(),
        winnerId: winner?.playerId,
      },
    });

    // Auto-finish league session if all matches are done
    if (updatedMatch.gameSessionId) {
      const sessionMatches = await prisma.match.findMany({
        where: { gameSessionId: updatedMatch.gameSessionId },
        select: { status: true },
      });
      const allDone = sessionMatches.every(
        (m) => m.status === "finished" || m.status === "cancelled"
      );
      if (allDone) {
        await finishLeagueSession(updatedMatch.gameSessionId);
      }
    }

    return NextResponse.json({ status: "finished" });
  }

  return NextResponse.json({ status: "pending_validation", confirmedCount, required: majority });
}
