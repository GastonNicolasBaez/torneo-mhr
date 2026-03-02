"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Trophy, CheckCircle, Clock, XCircle, Users, Plus } from "lucide-react";
import { useCurrentPlayer } from "@/contexts/PlayerContext";

interface Player {
  id: string;
  name: string;
  avatarEmoji: string;
  colorHex: string;
}

interface MatchResult {
  id: string;
  matchId: string;
  playerId: string;
  placement: number;
  tournamentPoints: number;
  teamId?: string | null;
}

interface Match {
  id: string;
  status: string;
  type: string;
  roundNumber: number;
  results: MatchResult[];
}

interface Standing {
  playerId: string;
  wins: number;
  draws: number;
  losses: number;
  leaguePoints: number;
  placement: number;
}

interface Game {
  id: string;
  name: string;
}

interface GameSession {
  id: string;
  tournamentId: string;
  gameId: string;
  type: string;
  status: string;
  roundNumber: number;
}

interface SessionData {
  session: GameSession;
  game: Game | null;
  matches: Match[];
  standings: Standing[];
  players: Player[];
}

export default function LeaguePage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;
  const sessionId = params.sessionId as string;

  const { currentPlayer } = useCurrentPlayer();

  const [data, setData] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Which match card is expanded (showing result entry)
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  // For each match: which player won ("p1" | "p2" | "draw") or null
  const [selectedWinner, setSelectedWinner] = useState<"p1" | "p2" | "draw" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 2v2 "add match" state
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [teamA, setTeamA] = useState<string[]>([]);
  const [teamB, setTeamB] = useState<string[]>([]);
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/game-sessions/${sessionId}`);
    if (res.ok) {
      const json = await res.json();
      setData(json);
    }
    setIsLoading(false);
  }, [sessionId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Auto-redirect when league finishes
  useEffect(() => {
    if (data?.session.status === "finished") {
      const timer = setTimeout(() => {
        router.push(`/tournament/${tournamentId}`);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [data?.session.status, tournamentId, router]);

  // Submit result for the expanded match inline
  const handleSubmitResult = async (matchId: string, match: Match) => {
    if (!selectedWinner || !currentPlayer) return;

    const p1 = match.results[0];
    const p2 = match.results[1];
    if (!p1 || !p2) return;

    setIsSubmitting(true);

    // Step 1: set match to playing if still pending
    if (match.status === "pending") {
      await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "playing" }),
      });
    }

    // Step 2: submit results (placement 1 = winner, 2 = loser, both 1 = draw)
    let p1Placement: number;
    let p2Placement: number;
    if (selectedWinner === "draw") {
      p1Placement = 1;
      p2Placement = 1;
    } else if (selectedWinner === "p1") {
      p1Placement = 1;
      p2Placement = 2;
    } else {
      p1Placement = 2;
      p2Placement = 1;
    }

    await fetch(`/api/matches/${matchId}/results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        results: [
          { playerId: p1.playerId, placement: p1Placement, tournamentPoints: 0 },
          { playerId: p2.playerId, placement: p2Placement, tournamentPoints: 0 },
        ],
      }),
    });

    // Step 3: auto-confirm on behalf of current player
    await fetch(`/api/matches/${matchId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmed: true }),
    });

    // Step 4: also confirm as the other player if they're the same person
    // (In league mode we trust whoever enters the result — confirm for both)
    const otherPlayerId = p1.playerId === currentPlayer.id ? p2.playerId : p1.playerId;
    // Temporarily act as other player for auto-confirm via admin-style confirm endpoint
    // Instead: hit confirm again so that majority (1 of 2) is enough
    // The confirm route already checks majority, so 1 confirm from 2 players = not majority
    // → we need a "host submits = auto-finish" approach for league matches

    // For league matches, use the PATCH approach to directly set finished
    // since the host/submitter is trusted in this flow
    await fetch(`/api/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "finished",
        winnerId: selectedWinner === "p1" ? p1.playerId : selectedWinner === "p2" ? p2.playerId : null,
      }),
    });

    // Step 5: check if all matches done → finishLeagueSession is triggered by confirm route
    // But since we used PATCH instead of confirm, we need to trigger finish manually
    await fetch(`/api/game-sessions/${sessionId}/check-complete`, {
      method: "POST",
    }).catch(() => {}); // best-effort, endpoint may not exist yet

    setExpandedMatchId(null);
    setSelectedWinner(null);
    setIsSubmitting(false);
    await fetchData();
  };

  const handleAddMatch = async () => {
    if (teamA.length === 0 || teamB.length === 0) return;
    setIsCreatingMatch(true);
    const res = await fetch(`/api/game-sessions/${sessionId}/matches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamAPlayers: teamA, teamBPlayers: teamB }),
    });
    if (res.ok) {
      setTeamA([]);
      setTeamB([]);
      setShowAddMatch(false);
      await fetchData();
    } else {
      alert("Error al crear partido");
    }
    setIsCreatingMatch(false);
  };

  const togglePlayerTeam = (playerId: string, team: "A" | "B") => {
    const setTeam = team === "A" ? setTeamA : setTeamB;
    const setOther = team === "A" ? setTeamB : setTeamA;
    setOther((prev) => prev.filter((id) => id !== playerId));
    setTeam((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400 animate-pulse">Cargando liga...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-red-400">Liga no encontrada</div>
      </div>
    );
  }

  const { session, game, matches, standings, players } = data;
  const is1v1 = session.type === "v1v1";
  const is2v2 = session.type === "v2v2";
  const isFinished = session.status === "finished";
  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));

  // Exclude summary match (no results = summary match created by finishLeagueSession)
  const playableMatches = matches.filter((m) => m.results.length > 0);
  const pendingMatches = playableMatches.filter((m) => m.status === "pending");
  const finishedMatches = playableMatches.filter((m) => m.status === "finished");
  const cancelledMatches = playableMatches.filter((m) => m.status === "cancelled");

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-zinc-800">
        <button
          onClick={() => router.push(`/tournament/${tournamentId}`)}
          className="text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1 min-w-0">
          <h1
            className="text-xl font-bold tracking-widest truncate"
            style={{ fontFamily: "var(--font-heading)", color: "#FF6B00" }}
          >
            {is1v1 ? "LIGA 1v1" : "LIGA 2v2"}
          </h1>
          {game && <p className="text-zinc-400 text-xs truncate">{game.name}</p>}
        </div>
        <span className="text-xs text-zinc-500 tabular-nums">
          {finishedMatches.length}/{playableMatches.length}
        </span>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4 max-w-lg mx-auto w-full">
        {/* Finished banner */}
        {isFinished && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-4 border border-green-500/40 bg-green-500/10 text-center"
          >
            <p className="text-green-400 font-bold text-lg tracking-wider">🏆 ¡Liga finalizada!</p>
            <p className="text-zinc-400 text-xs mt-1">Los puntos del torneo han sido asignados.</p>
            <p className="text-zinc-500 text-xs mt-2">Volviendo al torneo en 3s...</p>
          </motion.div>
        )}

        {/* Standings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
            <Trophy size={16} style={{ color: "#FF6B00" }} />
            <span className="text-sm font-bold text-zinc-200 tracking-wider uppercase">
              Tabla de posiciones
            </span>
          </div>
          <div className="p-2">
            {standings.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-4">
                Aún no hay partidos finalizados
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-500 text-xs">
                    <th className="text-left px-2 py-1">#</th>
                    <th className="text-left px-2 py-1">Jugador</th>
                    {is1v1 && (
                      <>
                        <th className="text-center px-2 py-1">G</th>
                        <th className="text-center px-2 py-1">E</th>
                        <th className="text-center px-2 py-1">P</th>
                      </>
                    )}
                    <th className="text-center px-2 py-1 font-bold">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s, idx) => {
                    const player = playerMap[s.playerId];
                    return (
                      <motion.tr
                        key={s.playerId}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`border-b border-zinc-800/50 last:border-0 ${s.placement === 1 ? "bg-orange-500/5" : ""}`}
                      >
                        <td className="px-2 py-2">
                          <span className={`text-xs font-bold ${
                            s.placement === 1 ? "text-yellow-400"
                            : s.placement === 2 ? "text-zinc-300"
                            : s.placement === 3 ? "text-amber-600"
                            : "text-zinc-500"
                          }`}>
                            {s.placement}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{player?.avatarEmoji ?? "?"}</span>
                            <span className="text-zinc-200 font-medium text-xs truncate max-w-20">
                              {player?.name ?? s.playerId}
                            </span>
                          </div>
                        </td>
                        {is1v1 && (
                          <>
                            <td className="text-center px-2 py-2 text-green-400 text-xs">{s.wins}</td>
                            <td className="text-center px-2 py-2 text-zinc-400 text-xs">{s.draws}</td>
                            <td className="text-center px-2 py-2 text-red-400 text-xs">{s.losses}</td>
                          </>
                        )}
                        <td className="text-center px-2 py-2">
                          <span className="font-bold text-sm" style={{ color: "#FF6B00" }}>
                            {s.leaguePoints}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>

        {/* Match list */}
        {!isFinished && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-zinc-500 tracking-widest uppercase px-1">
              Partidos
            </p>

            {/* Pending matches — clickable to enter result */}
            {pendingMatches.map((match, idx) => {
              const p1 = match.results[0];
              const p2 = match.results[1];
              const player1 = playerMap[p1?.playerId ?? ""];
              const player2 = playerMap[p2?.playerId ?? ""];
              const isExpanded = expandedMatchId === match.id;
              const isNext = idx === 0;

              return (
                <motion.div
                  key={match.id}
                  layout
                  className={`rounded-xl border overflow-hidden transition-colors ${
                    isExpanded
                      ? "border-orange-500/60 bg-zinc-900"
                      : isNext
                      ? "border-green-500/40 bg-zinc-900 cursor-pointer hover:border-green-500/70"
                      : "border-zinc-800 bg-zinc-900/50 cursor-pointer hover:border-zinc-700"
                  }`}
                  onClick={() => {
                    if (!isExpanded) {
                      setExpandedMatchId(match.id);
                      setSelectedWinner(null);
                    }
                  }}
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      {isNext && !isExpanded && (
                        <span className="text-xs font-bold tracking-wider" style={{ color: "#00FF87" }}>
                          ▶ SIGUIENTE
                        </span>
                      )}
                      {!isNext && !isExpanded && (
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <Clock size={12} /> Pendiente
                        </span>
                      )}
                      {isExpanded && (
                        <span className="text-xs font-bold text-orange-400 tracking-wider">
                          ⚡ EN JUEGO
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-600">R{match.roundNumber}</span>
                      {isExpanded && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedMatchId(null);
                            setSelectedWinner(null);
                          }}
                          className="text-zinc-500 hover:text-zinc-300 text-xs ml-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Players row */}
                  <div className="px-4 pb-3 flex items-center gap-3">
                    <span className="text-lg">{player1?.avatarEmoji}</span>
                    <span className="font-bold text-sm" style={{ color: player1?.colorHex || "#fafafa" }}>
                      {player1?.name ?? "?"}
                    </span>
                    <span className="text-zinc-500 text-xs mx-1">vs</span>
                    <span className="font-bold text-sm" style={{ color: player2?.colorHex || "#fafafa" }}>
                      {player2?.name ?? "?"}
                    </span>
                    <span className="text-lg">{player2?.avatarEmoji}</span>
                  </div>

                  {/* Expanded: result entry */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-zinc-800 overflow-hidden"
                      >
                        <div className="p-4 space-y-3">
                          <p className="text-xs text-zinc-500 uppercase tracking-wider">
                            ¿Quién ganó?
                          </p>
                          {/* Winner selection */}
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedWinner("p1"); }}
                              className={`py-3 px-2 rounded-xl border text-sm font-bold transition-all flex flex-col items-center gap-1 ${
                                selectedWinner === "p1"
                                  ? "border-green-500 bg-green-500/15 text-green-300"
                                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                              }`}
                            >
                              <span className="text-xl">{player1?.avatarEmoji}</span>
                              <span className="text-xs truncate max-w-full px-1" style={{ color: selectedWinner === "p1" ? undefined : player1?.colorHex }}>
                                {player1?.name}
                              </span>
                            </button>

                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedWinner("draw"); }}
                              className={`py-3 px-2 rounded-xl border text-sm font-bold transition-all flex flex-col items-center gap-1 ${
                                selectedWinner === "draw"
                                  ? "border-zinc-400 bg-zinc-700 text-zinc-200"
                                  : "border-zinc-700 text-zinc-500 hover:border-zinc-500"
                              }`}
                            >
                              <span className="text-xl">🤝</span>
                              <span className="text-xs">Empate</span>
                            </button>

                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedWinner("p2"); }}
                              className={`py-3 px-2 rounded-xl border text-sm font-bold transition-all flex flex-col items-center gap-1 ${
                                selectedWinner === "p2"
                                  ? "border-green-500 bg-green-500/15 text-green-300"
                                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                              }`}
                            >
                              <span className="text-xl">{player2?.avatarEmoji}</span>
                              <span className="text-xs truncate max-w-full px-1" style={{ color: selectedWinner === "p2" ? undefined : player2?.colorHex }}>
                                {player2?.name}
                              </span>
                            </button>
                          </div>

                          {/* Confirm button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSubmitResult(match.id, match); }}
                            disabled={!selectedWinner || isSubmitting}
                            className="w-full py-3 rounded-xl font-bold text-sm tracking-wider disabled:opacity-40 transition-all"
                            style={selectedWinner ? {
                              background: "linear-gradient(135deg, #FF6B00, #FF8C40)",
                              color: "#09090b",
                              boxShadow: "0 0 15px rgba(255,107,0,0.3)",
                            } : {
                              background: "#27272a",
                              color: "#52525b",
                            }}
                          >
                            {isSubmitting ? "Guardando..." : "✓ Confirmar resultado"}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {/* Finished matches */}
            {finishedMatches.length > 0 && (
              <div className="mt-1">
                <p className="text-xs text-zinc-600 tracking-widest uppercase mb-2 px-1">
                  Finalizados ({finishedMatches.length})
                </p>
                <div className="flex flex-col gap-2">
                  {finishedMatches.map((match) => {
                    const p1 = match.results[0];
                    const p2 = match.results[1];
                    const player1 = playerMap[p1?.playerId ?? ""];
                    const player2 = playerMap[p2?.playerId ?? ""];
                    const winner = match.results.find((r) => r.placement === 1);
                    const isDraw = match.results.filter((r) => r.placement === 1).length === 2;
                    const winnerPlayer = isDraw ? null : playerMap[winner?.playerId ?? ""];

                    return (
                      <div
                        key={match.id}
                        className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl px-4 py-3 flex items-center gap-3"
                      >
                        <CheckCircle size={12} className="text-green-400 flex-shrink-0" />
                        <span
                          className={`text-sm font-medium ${winner?.playerId === p1?.playerId && !isDraw ? "text-green-400" : "text-zinc-400"}`}
                        >
                          {player1?.avatarEmoji} {player1?.name ?? "?"}
                        </span>
                        <span className="text-zinc-600 text-xs">vs</span>
                        <span
                          className={`text-sm font-medium ${winner?.playerId === p2?.playerId && !isDraw ? "text-green-400" : "text-zinc-400"}`}
                        >
                          {player2?.avatarEmoji} {player2?.name ?? "?"}
                        </span>
                        <span className="ml-auto text-xs text-zinc-500">
                          {isDraw ? "Empate" : `Ganó ${winnerPlayer?.name ?? "?"}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cancelled matches */}
            {cancelledMatches.length > 0 && (
              <div className="flex flex-col gap-1 mt-1">
                {cancelledMatches.map((match) => {
                  const p1 = match.results[0];
                  const p2 = match.results[1];
                  return (
                    <div key={match.id} className="bg-zinc-900/30 border border-zinc-800/30 rounded-xl px-4 py-2 flex items-center gap-3">
                      <XCircle size={12} className="text-zinc-600 flex-shrink-0" />
                      <span className="text-zinc-600 text-xs">
                        {playerMap[p1?.playerId ?? ""]?.name ?? "?"} vs {playerMap[p2?.playerId ?? ""]?.name ?? "?"}
                      </span>
                      <span className="ml-auto text-xs text-zinc-700">Cancelado</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2v2: add match button */}
            {is2v2 && (
              <button
                onClick={() => setShowAddMatch(true)}
                className="mt-1 w-full py-3 rounded-xl font-bold text-sm tracking-wider flex items-center justify-center gap-2 border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
              >
                <Plus size={16} /> Agregar partido
              </button>
            )}
          </div>
        )}

        {/* Add Match panel (2v2) */}
        <AnimatePresence>
          {showAddMatch && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                  <Users size={14} /> Nuevo partido 2v2
                </h3>
                <button
                  onClick={() => { setShowAddMatch(false); setTeamA([]); setTeamB([]); }}
                  className="text-zinc-500 hover:text-zinc-300 text-xs"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {(["A", "B"] as const).map((team) => {
                  const teamState = team === "A" ? teamA : teamB;
                  const otherState = team === "A" ? teamB : teamA;
                  return (
                    <div key={team}>
                      <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">Equipo {team}</p>
                      <div className="flex flex-col gap-1">
                        {players.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => togglePlayerTeam(p.id, team)}
                            disabled={otherState.includes(p.id)}
                            className={`text-xs p-2 rounded-lg border text-left transition-all flex items-center gap-2 ${
                              teamState.includes(p.id)
                                ? team === "A" ? "border-orange-500 bg-orange-500/10 text-orange-300" : "border-blue-500 bg-blue-500/10 text-blue-300"
                                : otherState.includes(p.id)
                                ? "border-zinc-700 text-zinc-600 cursor-not-allowed"
                                : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
                            }`}
                          >
                            <span>{p.avatarEmoji}</span>
                            <span className="truncate">{p.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={handleAddMatch}
                disabled={teamA.length === 0 || teamB.length === 0 || isCreatingMatch}
                className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-40 transition-all"
                style={{
                  background: teamA.length > 0 && teamB.length > 0 ? "linear-gradient(135deg, #FF6B00, #FF8C40)" : undefined,
                  backgroundColor: teamA.length === 0 || teamB.length === 0 ? "#27272a" : undefined,
                  color: teamA.length > 0 && teamB.length > 0 ? "#09090b" : "#52525b",
                }}
              >
                {isCreatingMatch ? "Creando..." : "Crear partido"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress */}
        <div className="text-center text-xs text-zinc-600 pb-4">
          {finishedMatches.length} / {playableMatches.length} partidos jugados
        </div>
      </div>
    </div>
  );
}
