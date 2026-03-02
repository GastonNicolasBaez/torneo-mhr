import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentPlayer } from "@/lib/session";
import { calculateLeaderboard } from "@/lib/tournament-state";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tournamentPlayers = await prisma.tournamentPlayer.findMany({ where: { tournamentId: id } });
  const playerIds = tournamentPlayers.map((tp) => tp.playerId);
  const players = await prisma.player.findMany({ where: { id: { in: playerIds } } });
  const leaderboard = await calculateLeaderboard(id);

  return NextResponse.json({ tournament, players, leaderboard });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const currentPlayer = await getCurrentPlayer();
  if (!currentPlayer) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const { status, winnerId, name } = body;

  const update: Record<string, unknown> = {};
  if (status !== undefined) {
    update.status = status;
    if (status === "active") update.startedAt = new Date();
    if (status === "finished") update.finishedAt = new Date();
  }
  if (winnerId !== undefined) update.winnerId = winnerId;
  if (name !== undefined) update.name = name;

  const tournament = await prisma.tournament.update({ where: { id }, data: update });
  return NextResponse.json({ tournament });
}
