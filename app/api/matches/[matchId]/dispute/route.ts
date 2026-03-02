import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentPlayer } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const currentPlayer = await getCurrentPlayer();
  if (!currentPlayer) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const { action, reason } = body; // action: "resolve" | "cancel"

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const tournament = await prisma.tournament.findUnique({ where: { id: match.tournamentId } });
  if (tournament?.hostId !== currentPlayer.id) {
    return NextResponse.json({ error: "Only host can resolve disputes" }, { status: 403 });
  }

  if (action === "resolve") {
    const winner = await prisma.matchResult.findFirst({
      where: { matchId, placement: 1 },
    });
    await prisma.match.update({
      where: { id: matchId },
      data: { status: "finished", finishedAt: new Date(), winnerId: winner?.playerId },
    });
    await logAudit(matchId, "ADMIN_RESOLVED", currentPlayer.id, { reason }, currentPlayer.id);
    return NextResponse.json({ status: "finished" });
  }

  if (action === "cancel") {
    await prisma.match.update({ where: { id: matchId }, data: { status: "cancelled" } });
    await logAudit(matchId, "MATCH_CANCELLED", currentPlayer.id, { reason }, currentPlayer.id);
    return NextResponse.json({ status: "cancelled" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
