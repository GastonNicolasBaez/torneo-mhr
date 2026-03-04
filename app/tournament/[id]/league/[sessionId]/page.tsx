"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

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

  const [data, setData] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [selectedWinner, setSelectedWinner] = useState<"p1" | "p2" | "draw" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    if (data?.session.status === "finished") {
      const timer = setTimeout(() => {
        router.push(`/tournament/${tournamentId}`);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [data?.session.status, tournamentId, router]);

  const handleSubmitResult = async (matchId: string) => {
    if (!selectedWinner) return;
    setIsSubmitting(true);
    await fetch(`/api/matches/${matchId}/league-result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winner: selectedWinner }),
    });
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.p
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
          className="tech-label"
          style={{ color: "var(--accent-cyan)" }}
        >
          CARGANDO LIGA...
        </motion.p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="tech-label" style={{ color: "var(--accent-red)" }}>LIGA NO ENCONTRADA</p>
      </div>
    );
  }

  const { session, game, matches, standings, players } = data;
  const is1v1 = session.type === "v1v1";
  const is2v2 = session.type === "v2v2";
  const isFinished = session.status === "finished";
  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));

  const playableMatches = matches.filter((m) => m.results.length > 0);
  const pendingMatches = playableMatches.filter((m) => m.status === "pending");
  const finishedMatches = playableMatches.filter((m) => m.status === "finished");
  const cancelledMatches = playableMatches.filter((m) => m.status === "cancelled");

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/tournament/${tournamentId}`)}
            className="tech-label hover:text-white transition-colors"
          >
            ← VOLVER
          </button>
          <span className="text-white/20 text-xs">|</span>
          <div>
            <span className="tech-label" style={{ color: "var(--accent-cyan)" }}>
              ▸ {is1v1 ? "LIGA 1v1" : "LIGA 2v2"}
            </span>
            {game && <span className="text-white/30 text-xs ml-2">{game.name}</span>}
          </div>
        </div>
        <span className="terminal text-xs text-white/30">
          {finishedMatches.length}/{playableMatches.length}
        </span>
      </header>

      <div className="flex-1 p-6 flex flex-col gap-4 max-w-lg mx-auto w-full">

        {/* Finished banner */}
        {isFinished && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="hud-panel p-4 text-center"
            style={{ borderColor: "rgba(0,240,255,0.3)" }}
          >
            <p className="tech-label" style={{ color: "var(--accent-cyan)" }}>▸ LIGA FINALIZADA</p>
            <p className="text-white/30 text-xs mt-1">Puntos del torneo asignados. Volviendo en 3s...</p>
          </motion.div>
        )}

        {/* Standings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="hud-panel p-0 overflow-hidden"
        >
          <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
            <span className="tech-label" style={{ color: "var(--accent-cyan)" }}>▸ CLASIFICACIÓN</span>
            <span className="terminal text-xs text-white/20">{players.length} JUGADORES</span>
          </div>

          {standings.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="tech-label">SIN PARTIDOS AÚN</p>
            </div>
          ) : (
            <div>
              {/* Column headers */}
              <div className={`grid ${is1v1 ? "grid-cols-[1.5rem_1fr_2rem_2rem_2rem_3rem]" : "grid-cols-[1.5rem_1fr_3rem]"} gap-x-3 px-4 py-2 border-b border-white/5`}>
                {["#", "JUGADOR", ...(is1v1 ? ["G", "E", "P"] : []), "PTS"].map((h) => (
                  <span key={h} className="tech-label text-center first:text-left" style={{ fontSize: "0.6rem" }}>{h}</span>
                ))}
              </div>
              <div className="divide-y divide-white/5">
                {standings.map((s, idx) => {
                  const player = playerMap[s.playerId];
                  const isFirst = s.placement === 1;
                  return (
                    <motion.div
                      key={s.playerId}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className={`grid ${is1v1 ? "grid-cols-[1.5rem_1fr_2rem_2rem_2rem_3rem]" : "grid-cols-[1.5rem_1fr_3rem]"} gap-x-3 px-4 py-2.5 items-center`}
                      style={isFirst ? { background: "rgba(0,240,255,0.04)" } : {}}
                    >
                      <span
                        className="terminal text-xs text-center"
                        style={{ color: isFirst ? "var(--accent-cyan)" : "var(--muted)" }}
                      >
                        {String(s.placement).padStart(2, "0")}
                      </span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm">{player?.avatarEmoji ?? "?"}</span>
                        <span className="terminal text-xs truncate" style={{ color: player?.colorHex ?? "#fafafa" }}>
                          {(player?.name ?? s.playerId).toUpperCase()}
                        </span>
                        {isFirst && <span className="text-xs" style={{ color: "var(--accent-cyan)" }}>◀</span>}
                      </div>
                      {is1v1 && (
                        <>
                          <span className="terminal text-xs text-center" style={{ color: "var(--accent-cyan)" }}>{s.wins}</span>
                          <span className="terminal text-xs text-center text-white/30">{s.draws}</span>
                          <span className="terminal text-xs text-center" style={{ color: "var(--accent-red)" }}>{s.losses}</span>
                        </>
                      )}
                      <span
                        className="terminal text-right text-sm font-bold"
                        style={{ color: isFirst ? "var(--accent-cyan)" : "rgba(255,255,255,0.8)" }}
                      >
                        {s.leaguePoints}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>

        {/* Match list */}
        {!isFinished && (
          <div className="flex flex-col gap-2">
            <p className="tech-label">PARTIDOS</p>

            {/* Pending matches */}
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
                  className="border overflow-hidden transition-colors"
                  style={{
                    borderColor: isExpanded
                      ? "var(--accent-cyan)"
                      : isNext
                      ? "rgba(0,240,255,0.3)"
                      : "rgba(255,255,255,0.08)",
                    background: isExpanded
                      ? "rgba(0,240,255,0.04)"
                      : isNext
                      ? "rgba(0,240,255,0.02)"
                      : "transparent",
                    cursor: isExpanded ? "default" : "pointer",
                  }}
                  onClick={() => {
                    if (!isExpanded) {
                      setExpandedMatchId(match.id);
                      setSelectedWinner(null);
                    }
                  }}
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {isNext && !isExpanded && (
                        <span className="tech-label" style={{ color: "var(--accent-cyan)" }}>▶ SIGUIENTE</span>
                      )}
                      {!isNext && !isExpanded && (
                        <span className="tech-label">PENDIENTE</span>
                      )}
                      {isExpanded && (
                        <span className="tech-label" style={{ color: "var(--accent-cyan)" }}>⚡ EN JUEGO</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="terminal text-xs text-white/20">R{match.roundNumber}</span>
                      {isExpanded && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedMatchId(null);
                            setSelectedWinner(null);
                          }}
                          className="tech-label hover:text-white transition-colors ml-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Players row */}
                  <div className="px-4 pb-3 flex items-center gap-2">
                    <span className="text-base">{player1?.avatarEmoji}</span>
                    <span className="terminal text-sm font-bold" style={{ color: player1?.colorHex || "#fafafa" }}>
                      {player1?.name?.toUpperCase() ?? "?"}
                    </span>
                    <span className="tech-label mx-1">VS</span>
                    <span className="terminal text-sm font-bold" style={{ color: player2?.colorHex || "#fafafa" }}>
                      {player2?.name?.toUpperCase() ?? "?"}
                    </span>
                    <span className="text-base">{player2?.avatarEmoji}</span>
                  </div>

                  {/* Expanded: result entry */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-white/10 overflow-hidden"
                      >
                        <div className="p-4 flex flex-col gap-3">
                          <p className="tech-label">¿QUIÉN GANÓ?</p>

                          <div className="grid grid-cols-3 gap-2">
                            {/* Player 1 wins */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedWinner("p1"); }}
                              className="py-3 px-2 border text-center transition-all flex flex-col items-center gap-1"
                              style={{
                                borderColor: selectedWinner === "p1" ? "var(--accent-cyan)" : "rgba(255,255,255,0.1)",
                                background: selectedWinner === "p1" ? "rgba(0,240,255,0.08)" : "transparent",
                              }}
                            >
                              <span className="text-xl">{player1?.avatarEmoji}</span>
                              <span
                                className="terminal text-xs font-bold truncate max-w-full px-1"
                                style={{ color: selectedWinner === "p1" ? "var(--accent-cyan)" : player1?.colorHex }}
                              >
                                {player1?.name?.toUpperCase()}
                              </span>
                            </button>

                            {/* Draw */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedWinner("draw"); }}
                              className="py-3 px-2 border text-center transition-all flex flex-col items-center gap-1"
                              style={{
                                borderColor: selectedWinner === "draw" ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.1)",
                                background: selectedWinner === "draw" ? "rgba(255,255,255,0.05)" : "transparent",
                              }}
                            >
                              <span className="text-xl">🤝</span>
                              <span className="tech-label">EMPATE</span>
                            </button>

                            {/* Player 2 wins */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedWinner("p2"); }}
                              className="py-3 px-2 border text-center transition-all flex flex-col items-center gap-1"
                              style={{
                                borderColor: selectedWinner === "p2" ? "var(--accent-cyan)" : "rgba(255,255,255,0.1)",
                                background: selectedWinner === "p2" ? "rgba(0,240,255,0.08)" : "transparent",
                              }}
                            >
                              <span className="text-xl">{player2?.avatarEmoji}</span>
                              <span
                                className="terminal text-xs font-bold truncate max-w-full px-1"
                                style={{ color: selectedWinner === "p2" ? "var(--accent-cyan)" : player2?.colorHex }}
                              >
                                {player2?.name?.toUpperCase()}
                              </span>
                            </button>
                          </div>

                          {/* Confirm */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSubmitResult(match.id); }}
                            disabled={!selectedWinner || isSubmitting}
                            className="w-full py-3 font-bold text-sm tracking-widest uppercase transition-all disabled:opacity-30"
                            style={{
                              background: selectedWinner ? "var(--accent-cyan)" : "transparent",
                              color: selectedWinner ? "#000" : "rgba(255,255,255,0.2)",
                              border: `1px solid ${selectedWinner ? "var(--accent-cyan)" : "rgba(255,255,255,0.1)"}`,
                            }}
                          >
                            {isSubmitting ? "GUARDANDO..." : "✓ CONFIRMAR RESULTADO"}
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
                <p className="tech-label mb-2">FINALIZADOS ({finishedMatches.length})</p>
                <div className="flex flex-col gap-1">
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
                        className="flex items-center gap-3 px-4 py-2.5 border border-white/5"
                      >
                        <span className="w-1 h-3 flex-shrink-0" style={{ background: "var(--accent-cyan)" }} />
                        <span className={`terminal text-xs ${winner?.playerId === p1?.playerId && !isDraw ? "" : "opacity-30"}`}
                          style={{ color: winner?.playerId === p1?.playerId && !isDraw ? "var(--accent-cyan)" : "rgba(255,255,255,0.7)" }}>
                          {player1?.avatarEmoji} {player1?.name?.toUpperCase() ?? "?"}
                        </span>
                        <span className="tech-label">VS</span>
                        <span className={`terminal text-xs ${winner?.playerId === p2?.playerId && !isDraw ? "" : "opacity-30"}`}
                          style={{ color: winner?.playerId === p2?.playerId && !isDraw ? "var(--accent-cyan)" : "rgba(255,255,255,0.7)" }}>
                          {player2?.avatarEmoji} {player2?.name?.toUpperCase() ?? "?"}
                        </span>
                        <span className="ml-auto terminal text-xs text-white/25">
                          {isDraw ? "EMPATE" : `▸ ${winnerPlayer?.name?.toUpperCase() ?? "?"}`}
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
                    <div key={match.id} className="flex items-center gap-3 px-4 py-2 border border-white/5 opacity-30">
                      <span className="w-1 h-3 flex-shrink-0 bg-white/20" />
                      <span className="terminal text-xs text-white/40">
                        {playerMap[p1?.playerId ?? ""]?.name?.toUpperCase() ?? "?"} VS {playerMap[p2?.playerId ?? ""]?.name?.toUpperCase() ?? "?"}
                      </span>
                      <span className="ml-auto tech-label">CANCELADO</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2v2: add match button */}
            {is2v2 && (
              <button
                onClick={() => setShowAddMatch(true)}
                className="w-full py-3 font-bold text-sm tracking-widest uppercase border border-white/10 text-white/30 hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)] transition-colors mt-1"
              >
                + AGREGAR PARTIDO
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
              className="hud-panel p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="tech-label" style={{ color: "var(--accent-cyan)" }}>NUEVO PARTIDO 2v2</p>
                <button
                  onClick={() => { setShowAddMatch(false); setTeamA([]); setTeamB([]); }}
                  className="tech-label hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {(["A", "B"] as const).map((team) => {
                  const teamState = team === "A" ? teamA : teamB;
                  const otherState = team === "A" ? teamB : teamA;
                  const teamColor = team === "A" ? "var(--accent-cyan)" : "#a78bfa";
                  return (
                    <div key={team}>
                      <p className="tech-label mb-2" style={{ color: teamColor }}>EQUIPO {team}</p>
                      <div className="flex flex-col gap-1">
                        {players.map((p) => {
                          const inTeam = teamState.includes(p.id);
                          const inOther = otherState.includes(p.id);
                          return (
                            <button
                              key={p.id}
                              onClick={() => togglePlayerTeam(p.id, team)}
                              disabled={inOther}
                              className="text-xs p-2 border transition-all text-left flex items-center gap-2 disabled:opacity-20"
                              style={{
                                borderColor: inTeam ? teamColor : "rgba(255,255,255,0.08)",
                                background: inTeam ? "rgba(0,240,255,0.05)" : "transparent",
                                color: inTeam ? teamColor : "rgba(255,255,255,0.5)",
                              }}
                            >
                              <span>{p.avatarEmoji}</span>
                              <span className="truncate terminal">{p.name.toUpperCase()}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleAddMatch}
                disabled={teamA.length === 0 || teamB.length === 0 || isCreatingMatch}
                className="w-full py-3 font-bold text-sm tracking-widest uppercase transition-all disabled:opacity-30"
                style={{
                  background: teamA.length > 0 && teamB.length > 0 ? "var(--accent-cyan)" : "transparent",
                  color: teamA.length > 0 && teamB.length > 0 ? "#000" : "rgba(255,255,255,0.2)",
                  border: "1px solid var(--accent-cyan)",
                }}
              >
                {isCreatingMatch ? "CREANDO..." : "▸ CREAR PARTIDO"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress */}
        <div className="text-center pb-4">
          <span className="terminal text-xs text-white/20">
            {finishedMatches.length} / {playableMatches.length} PARTIDOS JUGADOS
          </span>
        </div>
      </div>
    </div>
  );
}
