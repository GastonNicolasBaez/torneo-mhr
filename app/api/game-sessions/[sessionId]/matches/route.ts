import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentPlayer } from "@/lib/session";

export async function POST(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const currentPlayer = await getCurrentPlayer();
  if (!currentPlayer) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.status === "finished") {
    return NextResponse.json({ error: "Session is already finished" }, { status: 400 });
  }
  if (session.type !== "v2v2") {
    return NextResponse.json({ error: "Only 2v2 sessions support manual match creation" }, { status: 400 });
  }

  const body = await request.json();
  const { teamAPlayers, teamBPlayers } = body;

  if (!Array.isArray(teamAPlayers) || !Array.isArray(teamBPlayers)) {
    return NextResponse.json({ error: "teamAPlayers and teamBPlayers are required arrays" }, { status: 400 });
  }
  if (teamAPlayers.length === 0 || teamBPlayers.length === 0) {
    return NextResponse.json({ error: "Each team must have at least one player" }, { status: 400 });
  }

  // Create the match
  const match = await prisma.match.create({
    data: {
      tournamentId: session.tournamentId,
      gameId: session.gameId,
      type: "v2v2",
      status: "pending",
      roundNumber: session.roundNumber,
      gameSessionId: sessionId,
    },
  });

  // Create stub MatchResults for both teams
  const stubResults = [
    ...teamAPlayers.map((playerId: string) => ({
      matchId: match.id,
      playerId,
      tournamentPoints: 0,
      placement: 0,
      teamId: "A",
      isConfirmed: false,
    })),
    ...teamBPlayers.map((playerId: string) => ({
      matchId: match.id,
      playerId,
      tournamentPoints: 0,
      placement: 0,
      teamId: "B",
      isConfirmed: false,
    })),
  ];

  await prisma.matchResult.createMany({ data: stubResults });

  return NextResponse.json({ match, teamAPlayers, teamBPlayers }, { status: 201 });
}
