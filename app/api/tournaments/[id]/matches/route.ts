import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentPlayer } from "@/lib/session";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matches = await prisma.match.findMany({
    where: { tournamentId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ matches });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const currentPlayer = await getCurrentPlayer();
  if (!currentPlayer) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const { gameId, type, isMemeMatch, roundNumber } = body;

  if (!gameId || !type) return NextResponse.json({ error: "gameId and type required" }, { status: 400 });

  const match = await prisma.match.create({
    data: {
      tournamentId: id,
      gameId,
      type,
      status: "pending",
      isMemeMatch: isMemeMatch ?? false,
      roundNumber: roundNumber ?? 1,
    },
  });
  return NextResponse.json({ match }, { status: 201 });
}
