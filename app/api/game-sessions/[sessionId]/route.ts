import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  calculateLeagueStandings1v1,
  calculateLeagueStandings2v2,
  type LeagueMatch1v1,
  type LeagueMatch2v2,
} from "@/lib/scoring";
import { getTournamentPlayers } from "@/lib/tournament-state";

export async function GET(_: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;

  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const game = await prisma.game.findUnique({ where: { id: session.gameId } });

  // Fetch all matches belonging to this session
  const matches = await prisma.match.findMany({
    where: { gameSessionId: sessionId },
    orderBy: { createdAt: "asc" },
  });

  const matchIds = matches.map((m) => m.id);

  // Fetch all results for these matches
  const allResults = await prisma.matchResult.findMany({
    where: { matchId: { in: matchIds } },
  });

  // Get all tournament players
  const players = await getTournamentPlayers(session.tournamentId);
  const playerIds = players.map((p) => p.id);

  // Build a map: matchId -> results
  const resultsByMatch: Record<string, typeof allResults> = {};
  for (const r of allResults) {
    if (!resultsByMatch[r.matchId]) resultsByMatch[r.matchId] = [];
    resultsByMatch[r.matchId].push(r);
  }

  // Compute standings based on type
  let standings;
  if (session.type === "v1v1") {
    const leagueMatches: LeagueMatch1v1[] = matches
      .filter((m) => m.status === "finished")
      .map((m) => {
        const results = resultsByMatch[m.id] ?? [];
        const p1 = results[0]?.playerId;
        const p2 = results[1]?.playerId;
        if (!p1 || !p2) return null;

        // Determine winner/loser from placement
        const winner = results.find((r) => r.placement === 1);
        const loser = results.find((r) => r.placement === 2);
        const isDraw = results.filter((r) => r.placement === 1).length === 2;

        return {
          winnerId: isDraw ? null : (winner?.playerId ?? null),
          loserId: isDraw ? null : (loser?.playerId ?? null),
          playerIds: [p1, p2] as [string, string],
        };
      })
      .filter((m): m is LeagueMatch1v1 => m !== null);

    const result = calculateLeagueStandings1v1(leagueMatches, playerIds);
    standings = result.standings;
  } else {
    // 2v2: use teamId from MatchResult to determine teams
    const leagueMatches: LeagueMatch2v2[] = matches
      .filter((m) => m.status === "finished")
      .map((m) => {
        const results = resultsByMatch[m.id] ?? [];
        const teamA = results.filter((r) => r.teamId === "A").map((r) => r.playerId);
        const teamB = results.filter((r) => r.teamId === "B").map((r) => r.playerId);
        if (!teamA.length || !teamB.length) return null;

        const teamAWinner = results.find((r) => r.teamId === "A" && r.placement === 1);
        const teamBWinner = results.find((r) => r.teamId === "B" && r.placement === 1);
        const isDraw = teamAWinner && teamBWinner;

        return {
          teamAPlayers: teamA,
          teamBPlayers: teamB,
          teamAWon: isDraw ? null : (teamAWinner ? true : false),
        };
      })
      .filter((m): m is LeagueMatch2v2 => m !== null);

    const result = calculateLeagueStandings2v2(leagueMatches, playerIds);
    standings = result.standings;
  }

  // Enrich with player info
  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));
  const enrichedStandings = standings.map((s) => ({
    ...s,
    player: playerMap[s.playerId],
  }));

  // Enrich matches with their results
  const enrichedMatches = matches.map((m) => ({
    ...m,
    results: (resultsByMatch[m.id] ?? []).map((r) => ({
      ...r,
      player: playerMap[r.playerId],
    })),
  }));

  return NextResponse.json({
    session,
    game,
    matches: enrichedMatches,
    standings: enrichedStandings,
    players,
  });
}
