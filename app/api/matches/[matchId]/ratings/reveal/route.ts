import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentPlayer } from "@/lib/session";

export async function POST(_: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const currentPlayer = await getCurrentPlayer();
  if (!currentPlayer) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await prisma.gameRating.updateMany({
    where: { matchId },
    data: { isRevealed: true },
  });

  const ratings = await prisma.gameRating.findMany({ where: { matchId } });
  return NextResponse.json({ ratings });
}
