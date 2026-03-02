import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentPlayer } from "@/lib/session";
import { getTournamentPlayers } from "@/lib/tournament-state";

/**
 * Circle-method round-robin for an odd number of players.
 * Fix players[0], rotate players[1..n-1] each round.
 * Each round produces floor(n/2) matches; the last rotating player gets a bye.
 * Returns pairs in round order (all round-1 matches, then round-2, etc.)
 */
function generateRoundRobinOrder(playerIds: string[]): Array<[string, string]> {
  const n = playerIds.length;
  const fixed = playerIds[0];
  const rotating = [...playerIds.slice(1)];
  const pairs: Array<[string, string]> = [];

  for (let round = 0; round < n - 1; round++) {
    // fixed vs rotating[0]
    pairs.push([fixed, rotating[0]]);
    // pair up the rest: rotating[1] vs rotating[n-2], rotating[2] vs rotating[n-3], …
    const half = Math.floor(rotating.length / 2);
    for (let i = 1; i <= half; i++) {
      const p1 = rotating[i];
      const p2 = rotating[rotating.length - i];
      if (p1 && p2 && p1 !== p2) pairs.push([p1, p2]);
    }
    // rotate: move last element to front
    rotating.unshift(rotating.pop()!);
  }

  return pairs;
}

/** Given a 0-based pair index, return the 1-based league round number. */
function getRoundForPairIndex(pairIndex: number, numPlayers: number): number {
  const matchesPerRound = Math.floor(numPlayers / 2);
  return Math.floor(pairIndex / matchesPerRound) + 1;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: tournamentId } = await params;
  const currentPlayer = await getCurrentPlayer();
  if (!currentPlayer) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const { gameId, type, roundNumber } = body;

  if (!gameId || !type) return NextResponse.json({ error: "gameId and type required" }, { status: 400 });
  if (type !== "v1v1" && type !== "v2v2") {
    return NextResponse.json({ error: "type must be v1v1 or v2v2 for a league session" }, { status: 400 });
  }

  // Verify game exists
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });

  // Verify tournament exists
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });

  // Create the session
  const session = await prisma.gameSession.create({
    data: {
      tournamentId,
      gameId,
      type,
      status: "active",
      roundNumber: roundNumber ?? 1,
    },
  });

  // For 1v1: generate all C(n,2) matches using round-robin circle method
  if (type === "v1v1") {
    const players = await getTournamentPlayers(tournamentId);
    const playerIds = players.map((p) => p.id);

    // Circle method: fix first player, rotate the rest
    // Each iteration = one league round; pairs are created per round
    const pairs = generateRoundRobinOrder(playerIds);

    // Create matches sequentially (preserving order) with league round number
    const createdMatches: { id: string }[] = [];
    for (let idx = 0; idx < pairs.length; idx++) {
      const leagueRound = getRoundForPairIndex(idx, playerIds.length);
      const match = await prisma.match.create({
        data: {
          tournamentId,
          gameId,
          type: "v1v1" as const,
          status: "pending" as const,
          isMemeMatch: false,
          roundNumber: leagueRound,
          gameSessionId: session.id,
        },
      });
      createdMatches.push(match);
    }

    // Create stub MatchResults so we know which 2 players belong to each match
    await Promise.all(
      createdMatches.map((match, idx) => {
        const [p1, p2] = pairs[idx];
        return Promise.all([
          prisma.matchResult.create({
            data: {
              matchId: match.id,
              playerId: p1,
              tournamentPoints: 0,
              placement: 0,
              isConfirmed: false,
            },
          }),
          prisma.matchResult.create({
            data: {
              matchId: match.id,
              playerId: p2,
              tournamentPoints: 0,
              placement: 0,
              isConfirmed: false,
            },
          }),
        ]);
      })
    );

    return NextResponse.json({ session, matchCount: createdMatches.length }, { status: 201 });
  }

  // For 2v2: session only, matches added manually
  return NextResponse.json({ session, matchCount: 0 }, { status: 201 });
}
