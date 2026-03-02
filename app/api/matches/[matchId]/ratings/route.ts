import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentPlayer } from "@/lib/session";

export async function GET(_: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const ratings = await prisma.gameRating.findMany({ where: { matchId } });
  return NextResponse.json({ ratings });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const currentPlayer = await getCurrentPlayer();
  if (!currentPlayer) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { score, comment } = await request.json();

  if (score < 1 || score > 10) {
    return NextResponse.json({ error: "Score must be between 1 and 10" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const rating = await prisma.gameRating.upsert({
    where: { matchId_playerId: { matchId, playerId: currentPlayer.id } },
    create: {
      matchId,
      gameId: match.gameId,
      playerId: currentPlayer.id,
      score,
      comment: comment || null,
    },
    update: { score, comment: comment || null },
  });

  return NextResponse.json({ rating }, { status: 201 });
}
