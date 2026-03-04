"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Player {
  id: string;
  name: string;
  avatarEmoji: string;
  colorHex: string;
}

interface LeaderboardEntry {
  playerId: string;
  totalScore: number;
  wins: number;
  matchesPlayed: number;
}

interface Tournament {
  id: string;
  name: string;
  status: string;
}

interface MatchEvent {
  gameId: string;
  type: string;
  status: string;
  createdAt: string;
}

export default function TVPage() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentMatch, setRecentMatch] = useState<MatchEvent | null>(null);
  const [games, setGames] = useState<Record<string, string>>({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const [ticker, setTicker] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const loadData = useCallback(async () => {
    const res = await fetch("/api/tournaments/active");
    if (!res.ok) return;
    const { tournament: t } = await res.json();
    if (!t) return;

    setTournament(t);

    const [tRes, mRes, gRes] = await Promise.all([
      fetch(`/api/tournaments/${t.id}`),
      fetch(`/api/tournaments/${t.id}/matches`),
      fetch("/api/games"),
    ]);

    if (tRes.ok) {
      const tData = await tRes.json();
      setPlayers(tData.players || []);
      setLeaderboard(tData.leaderboard || []);
    }
    if (mRes.ok) {
      const mData = await mRes.json();
      if (mData.matches?.length) setRecentMatch(mData.matches[0]);
    }
    if (gRes.ok) {
      const gData = await gRes.json();
      const gMap: Record<string, string> = {};
      for (const g of gData.games || []) gMap[g.id] = g.name;
      setGames(gMap);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    const messages = [
      "TORNEO MHR — LIGA DE VIDEOJUEGOS ENTRE AMIGOS",
      "ROUND-ROBIN LIBRE — LA RULETA DECIDE EL JUEGO",
      "SISTEMA VAR ACTIVO — TODOS LOS RESULTADOS SON VERIFICADOS",
      ...(leaderboard[0]
        ? [`LÍDER ACTUAL: ${players.find((p) => p.id === leaderboard[0]?.playerId)?.name?.toUpperCase() || "?"} — ${leaderboard[0]?.totalScore} PTS`]
        : []),
      ...(recentMatch ? [`ÚLTIMA PARTIDA: ${games[recentMatch.gameId]?.toUpperCase() || "..."} — ${recentMatch.type.toUpperCase()}`] : []),
    ];
    setTicker(messages);
  }, [leaderboard, players, recentMatch, games]);

  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));

  return (
    <div
      className="min-h-screen bg-black flex flex-col overflow-hidden"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      {/* Top bar */}
      <header
        className="flex items-center justify-between px-8 py-4 border-b"
        style={{ borderColor: "rgba(0,240,255,0.2)", background: "rgba(0,240,255,0.03)" }}
      >
        <div className="flex items-center gap-4">
          <span className="tech-label" style={{ color: "var(--accent-cyan)" }}>▸ TORNEO MHR</span>
          {tournament && (
            <>
              <span className="text-white/20 text-xs">|</span>
              <span className="tech-label">{tournament.name}</span>
            </>
          )}
        </div>
        <span className="terminal text-xl text-white/40">
          {currentTime.toLocaleTimeString("es-AR")}
        </span>
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-8 py-8">
        {leaderboard.length === 0 ? (
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="text-center"
          >
            <p className="tech-label mb-3" style={{ color: "var(--accent-cyan)" }}>▸ SISTEMA EN ESPERA</p>
            <p className="terminal text-2xl text-white/20">ESPERANDO PRIMERA PARTIDA...</p>
          </motion.div>
        ) : (
          <div className="w-full max-w-3xl flex flex-col gap-3">
            {leaderboard.map((entry, index) => {
              const player = playerMap[entry.playerId];
              if (!player) return null;
              const isLeader = index === 0;
              const maxScore = leaderboard[0]?.totalScore || 1;

              return (
                <motion.div
                  key={entry.playerId}
                  initial={{ opacity: 0, x: -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className="relative border overflow-hidden"
                  style={{
                    borderColor: isLeader ? "rgba(0,240,255,0.4)" : "rgba(255,255,255,0.08)",
                    background: isLeader ? "rgba(0,240,255,0.04)" : "rgba(5,5,5,0.8)",
                  }}
                >
                  {/* Score bar behind */}
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(entry.totalScore / maxScore) * 100}%` }}
                    transition={{ delay: 0.5 + index * 0.08, duration: 1 }}
                    className="absolute inset-y-0 left-0 opacity-8"
                    style={{ background: player.colorHex }}
                  />

                  <div className="relative flex items-center gap-6 px-6 py-5">
                    {/* Rank */}
                    <span
                      className="terminal text-2xl font-bold w-10 text-center"
                      style={{ color: isLeader ? "var(--accent-cyan)" : "rgba(255,255,255,0.2)" }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    {/* Avatar */}
                    <span className="text-5xl">{player.avatarEmoji}</span>

                    {/* Name + stats */}
                    <div className="flex-1">
                      <p
                        className="text-3xl font-bold tracking-widest"
                        style={{ fontFamily: "var(--font-heading)", color: player.colorHex }}
                      >
                        {player.name.toUpperCase()}
                      </p>
                      <p className="terminal text-sm text-white/25 mt-1">
                        {entry.matchesPlayed} PARTIDAS &nbsp;·&nbsp; {entry.wins} VICTORIAS
                      </p>
                    </div>

                    {/* Score */}
                    <motion.span
                      key={entry.totalScore}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      className="terminal text-6xl font-bold"
                      style={{
                        color: isLeader ? "var(--accent-cyan)" : "rgba(255,255,255,0.7)",
                        textShadow: isLeader ? "0 0 30px rgba(0,240,255,0.3)" : "none",
                      }}
                    >
                      {entry.totalScore}
                    </motion.span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ticker */}
      <div
        className="border-t py-3 px-4 overflow-hidden"
        style={{ borderColor: "rgba(0,240,255,0.1)", background: "rgba(0,240,255,0.02)" }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={ticker.join(",")}
            initial={{ x: "100%" }}
            animate={{ x: "-100%" }}
            transition={{ duration: 25, ease: "linear" }}
            className="whitespace-nowrap terminal text-xs text-white/30 tracking-widest"
          >
            {ticker.join("   ▸   ")}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
