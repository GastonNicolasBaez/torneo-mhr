import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournamentPlayers = await prisma.tournamentPlayer.findMany({ where: { tournamentId: id } });
  const playerIds = tournamentPlayers.map((tp) => tp.playerId);
  const players = await prisma.player.findMany({ where: { id: { in: playerIds } } });
  return NextResponse.json({ players, tournamentPlayers });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { playerId } = await request.json();

  const tp = await prisma.tournamentPlayer.create({
    data: { tournamentId: id, playerId },
  });
  return NextResponse.json({ tournamentPlayer: tp }, { status: 201 });
}
