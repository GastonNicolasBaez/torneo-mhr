export type MatchType = "v1v1" | "ffa" | "v2v2";

export interface PlacementResult {
  playerId: string;
  placement: number;
  gameScore?: number;
  teamId?: string;
}

export interface ScoringResult {
  playerId: string;
  tournamentPoints: number;
  placement: number;
  gameScore?: number;
  teamId?: string;
}

const DEFAULT_POINT_SYSTEM = { "1st": 4, "2nd": 3, "3rd": 2, "4th": 1, "5th": 0 };

function getPointsForPlacement(placement: number, pointSystem = DEFAULT_POINT_SYSTEM): number {
  const map: Record<number, keyof typeof DEFAULT_POINT_SYSTEM> = {
    1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th",
  };
  return pointSystem[map[placement]] ?? 0;
}

export function calculateFfaScores(
  placements: PlacementResult[],
  isMemeMatch = false,
  pointSystem = DEFAULT_POINT_SYSTEM
): ScoringResult[] {
  return placements.map((p) => ({
    playerId: p.playerId,
    tournamentPoints: isMemeMatch
      ? p.placement === 1 ? 1 : 0
      : getPointsForPlacement(p.placement, pointSystem),
    placement: p.placement,
    gameScore: p.gameScore,
  }));
}

export function calculate1v1Scores(
  winnerId: string,
  loserId: string,
  isDraw = false,
  isMemeMatch = false
): ScoringResult[] {
  if (isMemeMatch) {
    return [
      { playerId: winnerId, tournamentPoints: isDraw ? 0 : 1, placement: isDraw ? 1 : 1, gameScore: undefined },
      { playerId: loserId, tournamentPoints: 0, placement: isDraw ? 1 : 2, gameScore: undefined },
    ];
  }
  if (isDraw) {
    return [
      { playerId: winnerId, tournamentPoints: 2, placement: 1 },
      { playerId: loserId, tournamentPoints: 2, placement: 1 },
    ];
  }
  return [
    { playerId: winnerId, tournamentPoints: 4, placement: 1 },
    { playerId: loserId, tournamentPoints: 0, placement: 2 },
  ];
}

export function calculate2v2Scores(
  teamAPlayers: string[],
  teamBPlayers: string[],
  teamAWins: number,
  teamBWins: number
): ScoringResult[] {
  const results: ScoringResult[] = [];
  const teamAPoints = teamAWins;
  const teamBPoints = teamBWins;
  const teamAPlacement = teamAPoints >= teamBPoints ? 1 : 2;
  const teamBPlacement = teamBPoints >= teamAPoints ? 1 : 2;

  for (const playerId of teamAPlayers) {
    results.push({
      playerId,
      tournamentPoints: teamAPoints,
      placement: teamAPlacement,
      teamId: "A",
    });
  }
  for (const playerId of teamBPlayers) {
    results.push({
      playerId,
      tournamentPoints: teamBPoints,
      placement: teamBPlacement,
      teamId: "B",
    });
  }
  return results;
}

export function parsePointSystem(json: string): typeof DEFAULT_POINT_SYSTEM {
  try {
    return JSON.parse(json);
  } catch {
    return DEFAULT_POINT_SYSTEM;
  }
}

// --- League (GameSession) standings ---

export interface LeagueMatch1v1 {
  winnerId: string | null; // null = draw
  loserId: string | null;  // null = draw
  playerIds: [string, string];
}

export interface LeagueMatch2v2 {
  teamAPlayers: string[];
  teamBPlayers: string[];
  teamAWon: boolean | null; // null = draw
}

export interface LeagueStanding {
  playerId: string;
  wins: number;
  draws: number;
  losses: number;
  leaguePoints: number; // 3 per win, 1 per draw
  placement: number;
}

export interface LeagueTournamentPoints {
  playerId: string;
  tournamentPoints: number;
  placement: number;
}

export function calculateLeagueStandings1v1(
  matches: LeagueMatch1v1[],
  allPlayerIds: string[],
  pointSystem = DEFAULT_POINT_SYSTEM
): { standings: LeagueStanding[]; tournamentPoints: LeagueTournamentPoints[] } {
  const stats: Record<string, { wins: number; draws: number; losses: number }> = {};
  for (const pid of allPlayerIds) {
    stats[pid] = { wins: 0, draws: 0, losses: 0 };
  }

  for (const match of matches) {
    const isDraw = match.winnerId === null;
    if (isDraw) {
      for (const pid of match.playerIds) {
        if (stats[pid]) stats[pid].draws++;
      }
    } else {
      if (match.winnerId && stats[match.winnerId]) stats[match.winnerId].wins++;
      if (match.loserId && stats[match.loserId]) stats[match.loserId].losses++;
    }
  }

  const standings: LeagueStanding[] = allPlayerIds
    .map((pid) => {
      const s = stats[pid];
      const leaguePoints = s.wins * 3 + s.draws;
      return { playerId: pid, ...s, leaguePoints, placement: 0 };
    })
    .sort((a, b) => b.leaguePoints - a.leaguePoints || b.wins - a.wins);

  let placement = 1;
  for (let i = 0; i < standings.length; i++) {
    if (i > 0 && standings[i].leaguePoints === standings[i - 1].leaguePoints) {
      standings[i].placement = standings[i - 1].placement;
    } else {
      standings[i].placement = placement;
    }
    placement++;
  }

  const tournamentPoints: LeagueTournamentPoints[] = standings.map((s) => ({
    playerId: s.playerId,
    tournamentPoints: getPointsForPlacement(s.placement, pointSystem),
    placement: s.placement,
  }));

  return { standings, tournamentPoints };
}

export function calculateLeagueStandings2v2(
  matches: LeagueMatch2v2[],
  allPlayerIds: string[],
  pointSystem = DEFAULT_POINT_SYSTEM
): { standings: LeagueStanding[]; tournamentPoints: LeagueTournamentPoints[] } {
  const stats: Record<string, { wins: number; draws: number; losses: number }> = {};
  for (const pid of allPlayerIds) {
    stats[pid] = { wins: 0, draws: 0, losses: 0 };
  }

  for (const match of matches) {
    if (match.teamAWon === null) {
      for (const pid of [...match.teamAPlayers, ...match.teamBPlayers]) {
        if (stats[pid]) stats[pid].draws++;
      }
    } else if (match.teamAWon) {
      for (const pid of match.teamAPlayers) { if (stats[pid]) stats[pid].wins++; }
      for (const pid of match.teamBPlayers) { if (stats[pid]) stats[pid].losses++; }
    } else {
      for (const pid of match.teamBPlayers) { if (stats[pid]) stats[pid].wins++; }
      for (const pid of match.teamAPlayers) { if (stats[pid]) stats[pid].losses++; }
    }
  }

  const standings: LeagueStanding[] = allPlayerIds
    .map((pid) => {
      const s = stats[pid];
      const leaguePoints = s.wins * 3 + s.draws;
      return { playerId: pid, ...s, leaguePoints, placement: 0 };
    })
    .sort((a, b) => b.leaguePoints - a.leaguePoints || b.wins - a.wins);

  let placement = 1;
  for (let i = 0; i < standings.length; i++) {
    if (i > 0 && standings[i].leaguePoints === standings[i - 1].leaguePoints) {
      standings[i].placement = standings[i - 1].placement;
    } else {
      standings[i].placement = placement;
    }
    placement++;
  }

  const tournamentPoints: LeagueTournamentPoints[] = standings.map((s) => ({
    playerId: s.playerId,
    tournamentPoints: getPointsForPlacement(s.placement, pointSystem),
    placement: s.placement,
  }));

  return { standings, tournamentPoints };
}
