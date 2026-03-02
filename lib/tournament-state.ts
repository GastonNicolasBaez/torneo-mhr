import prisma from "./prisma";

export type TournamentStatus = "lobby" | "active" | "tiebreak" | "finished";
export type MatchStatus = "pending" | "playing" | "rating" | "pending_validation" | "disputed" | "finished" | "cancelled";

export async function getActiveTournament() {
  return prisma.tournament.findFirst({
    where: { status: { in: ["lobby", "active", "tiebreak"] } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTournamentPlayers(tournamentId: string) {
  const tps = await prisma.tournamentPlayer.findMany({
    where: { tournamentId },
  });
  const playerIds = tps.map((tp) => tp.playerId);
  return prisma.player.findMany({ where: { id: { in: playerIds } } });
}

export async function calculateLeaderboard(tournamentId: string) {
  const tournamentPlayers = await prisma.tournamentPlayer.findMany({
    where: { tournamentId },
  });

  // Get all finished match IDs for this tournament
  const finishedMatches = await prisma.match.findMany({
    where: { tournamentId, status: "finished" },
    select: { id: true },
  });
  const finishedMatchIds = finishedMatches.map((m) => m.id);

  const leaderboard = await Promise.all(
    tournamentPlayers.map(async (tp) => {
      const results = await prisma.matchResult.findMany({
        where: {
          playerId: tp.playerId,
          matchId: { in: finishedMatchIds },
        },
      });

      const totalScore = results.reduce((sum, r) => sum + r.tournamentPoints, 0);
      const wins = results.filter((r) => r.placement === 1).length;
      const matchesPlayed = results.length;

      return {
        playerId: tp.playerId,
        totalScore,
        wins,
        matchesPlayed,
      };
    })
  );

  return leaderboard.sort((a, b) => b.totalScore - a.totalScore);
}

export async function checkTiebreak(tournamentId: string) {
  const leaderboard = await calculateLeaderboard(tournamentId);
  if (leaderboard.length < 2) return false;
  return leaderboard[0].totalScore === leaderboard[1].totalScore;
}

export async function getMatchHistory(tournamentId: string) {
  return prisma.match.findMany({
    where: { tournamentId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPairCoverage(tournamentId: string) {
  const matches = await prisma.match.findMany({
    where: { tournamentId, status: "finished" },
  });

  const pairs = new Set<string>();
  for (const match of matches) {
    const results = await prisma.matchResult.findMany({ where: { matchId: match.id } });
    const playerIds = results.map((r) => r.playerId).sort();
    for (let i = 0; i < playerIds.length; i++) {
      for (let j = i + 1; j < playerIds.length; j++) {
        pairs.add(`${playerIds[i]}-${playerIds[j]}`);
      }
    }
  }
  return pairs;
}

export async function advanceMatchStatus(
  matchId: string,
  newStatus: MatchStatus
) {
  const update: Record<string, unknown> = { status: newStatus };
  if (newStatus === "playing") update.startedAt = new Date();
  if (newStatus === "finished") update.finishedAt = new Date();

  return prisma.match.update({
    where: { id: matchId },
    data: update,
  });
}
