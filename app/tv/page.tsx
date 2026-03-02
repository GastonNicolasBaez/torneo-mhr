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

  // Update time
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

  // Ticker messages
  useEffect(() => {
    const messages = [
      "🎮 TORNEO MHR — Liga de Videojuegos entre Amigos",
      "🎲 Round-Robin Libre — La ruleta decide el juego",
      "⚡ Sistema VAR activo — Todos los resultados son verificados",
      ...(leaderboard[0]
        ? [`🏆 Líder actual: ${players.find((p) => p.id === leaderboard[0]?.playerId)?.name || "?"} con ${leaderboard[0]?.totalScore} pts`]
        : []),
      ...(recentMatch ? [`🎯 Última partida: ${games[recentMatch.gameId] || "..."} — ${recentMatch.type.toUpperCase()}`] : []),
    ];
    setTicker(messages);
  }, [leaderboard, players, recentMatch, games]);

  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));

  return (
    <div
      className="min-h-screen bg-zinc-950 flex flex-col overflow-hidden"
      style={{ fontFamily: "var(--font-heading)" }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-8 py-4 border-b"
        style={{ borderColor: "rgba(255,107,0,0.3)", background: "rgba(255,107,0,0.05)" }}
      >
        <h1
          className="text-3xl font-bold tracking-widest"
          style={{ color: "#FF6B00", textShadow: "0 0 20px rgba(255,107,0,0.5)" }}
        >
          TORNEO MHR
        </h1>
        {tournament && (
          <span className="text-zinc-300 text-lg tracking-wider">{tournament.name}</span>
        )}
        <span
          className="text-zinc-400 text-xl tracking-widest"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {currentTime.toLocaleTimeString("es-AR")}
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-8 py-6">
        {leaderboard.length === 0 ? (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="text-center"
          >
            <p className="text-6xl mb-4">🎮</p>
            <p className="text-2xl text-zinc-400 tracking-widest">Esperando primera partida...</p>
          </motion.div>
        ) : (
          <div className="w-full max-w-3xl space-y-4">
            {leaderboard.map((entry, index) => {
              const player = playerMap[entry.playerId];
              if (!player) return null;
              const medals = ["🥇", "🥈", "🥉"];
              const isLeader = index === 0;
              const maxScore = leaderboard[0]?.totalScore || 1;

              return (
                <motion.div
                  key={entry.playerId}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative rounded-2xl p-5 border overflow-hidden ${
                    isLeader ? "border-orange-500/50" : "border-zinc-800"
                  }`}
                  style={{
                    background: isLeader
                      ? "rgba(255,107,0,0.08)"
                      : "rgba(24,24,27,0.8)",
                    boxShadow: isLeader ? "0 0 30px rgba(255,107,0,0.15)" : "none",
                  }}
                >
                  {/* Score bar */}
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(entry.totalScore / maxScore) * 100}%` }}
                    transition={{ delay: 0.5 + index * 0.1, duration: 1 }}
                    className="absolute inset-0 opacity-10"
                    style={{ background: `linear-gradient(to right, ${player.colorHex}, transparent)` }}
                  />

                  <div className="relative flex items-center gap-6">
                    <span className="text-4xl w-12 text-center">
                      {medals[index] || `${index + 1}`}
                    </span>
                    <span className="text-5xl">{player.avatarEmoji}</span>
                    <div className="flex-1">
                      <p
                        className="text-3xl font-bold"
                        style={{ color: player.colorHex }}
                      >
                        {player.name}
                      </p>
                      <p className="text-zinc-400 text-sm mt-1">
                        {entry.matchesPlayed} partidas • {entry.wins} victorias
                      </p>
                    </div>
                    <motion.span
                      key={entry.totalScore}
                      initial={{ scale: 1.3 }}
                      animate={{ scale: 1 }}
                      className="text-6xl font-bold"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: isLeader ? "#FF6B00" : "#fafafa",
                        textShadow: isLeader ? "0 0 20px rgba(255,107,0,0.4)" : "none",
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
        style={{ borderColor: "rgba(255,107,0,0.2)", background: "rgba(255,107,0,0.03)" }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={ticker.join(",")}
            initial={{ x: "100%" }}
            animate={{ x: "-100%" }}
            transition={{ duration: 20, ease: "linear" }}
            className="whitespace-nowrap text-zinc-400 text-sm tracking-wider"
          >
            {ticker.join("   •   ")}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
