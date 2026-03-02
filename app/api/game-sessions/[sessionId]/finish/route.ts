import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentPlayer } from "@/lib/session";
import { finishLeagueSession } from "@/lib/league";

export async function POST(_: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const currentPlayer = await getCurrentPlayer();
  if (!currentPlayer) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.status === "finished") {
    return NextResponse.json({ error: "Session already finished" }, { status: 400 });
  }

  const result = await finishLeagueSession(sessionId);
  if (!result) return NextResponse.json({ error: "Failed to finish session" }, { status: 500 });

  return NextResponse.json(result);
}
