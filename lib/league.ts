import prisma from "@/lib/prisma";
import {
  calculateLeagueStandings1v1,
  calculateLeagueStandings2v2,
  type LeagueMatch1v1,
  type LeagueMatch2v2,
} from "@/lib/scoring";
import { getTournamentPlayers } from "@/lib/tournament-state";

/**
 * Calculate standings and create a summary match with tournament points.
 * Marks the session as finished.
 * Safe to call even if the session is already finished (no-op in that case).
 */
export async function finishLeagueSession(sessionId: string) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session || session.status === "finished") return null;

  const tournament = await prisma.tournament.findUnique({ where: { id: session.tournamentId } });
  if (!tournament) return null;

  const matches = await prisma.match.findMany({ where: { gameSessionId: sessionId } });
  const matchIds = matches.map((m) => m.id);

  const allResults = await prisma.matchResult.findMany({
    where: { matchId: { in: matchIds } },
  });

  const players = await getTournamentPlayers(session.tournamentId);
  const playerIds = players.map((p) => p.id);

  const resultsByMatch: Record<string, typeof allResults> = {};
  for (const r of allResults) {
    if (!resultsByMatch[r.matchId]) resultsByMatch[r.matchId] = [];
    resultsByMatch[r.matchId].push(r);
  }

  type PointSystem = { "1st": number; "2nd": number; "3rd": number; "4th": number; "5th": number };
  let pointSystem: PointSystem = { "1st": 4, "2nd": 3, "3rd": 2, "4th": 1, "5th": 0 };
  try {
    pointSystem = JSON.parse(tournament.pointSystem) as PointSystem;
  } catch { /* use default */ }

  let tournamentPoints: { playerId: string; tournamentPoints: number; placement: number }[];

  if (session.type === "v1v1") {
    const leagueMatches: LeagueMatch1v1[] = matches
      .filter((m) => m.status === "finished")
      .map((m) => {
        const results = resultsByMatch[m.id] ?? [];
        const p1 = results[0]?.playerId;
        const p2 = results[1]?.playerId;
        if (!p1 || !p2) return null;
        const isDraw = results.filter((r) => r.placement === 1).length === 2;
        const winner = results.find((r) => r.placement === 1);
        const loser = results.find((r) => r.placement === 2);
        return {
          winnerId: isDraw ? null : (winner?.playerId ?? null),
          loserId: isDraw ? null : (loser?.playerId ?? null),
          playerIds: [p1, p2] as [string, string],
        };
      })
      .filter((m): m is LeagueMatch1v1 => m !== null);

    const result = calculateLeagueStandings1v1(leagueMatches, playerIds, pointSystem);
    tournamentPoints = result.tournamentPoints;
  } else {
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

    const result = calculateLeagueStandings2v2(leagueMatches, playerIds, pointSystem);
    tournamentPoints = result.tournamentPoints;
  }

  const summaryMatch = await prisma.match.create({
    data: {
      tournamentId: session.tournamentId,
      gameId: session.gameId,
      type: session.type,
      status: "finished",
      roundNumber: session.roundNumber,
      gameSessionId: sessionId,
      finishedAt: new Date(),
      startedAt: new Date(),
    },
  });

  await prisma.matchResult.createMany({
    data: tournamentPoints.map((tp) => ({
      matchId: summaryMatch.id,
      playerId: tp.playerId,
      tournamentPoints: tp.tournamentPoints,
      placement: tp.placement,
      isConfirmed: true,
      confirmedAt: new Date(),
    })),
  });

  await prisma.gameSession.update({
    where: { id: sessionId },
    data: { status: "finished", finishedAt: new Date() },
  });

  return { summaryMatch, tournamentPoints };
}
