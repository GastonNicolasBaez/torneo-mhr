import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentPlayer } from "@/lib/session";

export async function GET() {
  const tournaments = await prisma.tournament.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ tournaments });
}

export async function POST(request: Request) {
  const currentPlayer = await getCurrentPlayer();
  if (!currentPlayer) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { name, playerIds } = body;

  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const tournament = await prisma.tournament.create({
    data: {
      name,
      status: "lobby",
      hostId: currentPlayer.id,
    },
  });

  if (playerIds?.length) {
    await prisma.tournamentPlayer.createMany({
      data: playerIds.map((pid: string) => ({
        tournamentId: tournament.id,
        playerId: pid,
      })),
    });
  }

  return NextResponse.json({ tournament }, { status: 201 });
}
