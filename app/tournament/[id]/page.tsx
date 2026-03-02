"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentPlayer } from "@/contexts/PlayerContext";
import { TournamentProvider, useTournament } from "@/contexts/TournamentContext";
import { Trophy, Zap, History, Tv, Settings, Plus, ChevronRight, Crown } from "lucide-react";

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

interface Match {
  id: string;
  gameId: string;
  type: string;
  status: string;
  roundNumber: number;
  isMemeMatch: boolean;
  createdAt: string;
}

function TournamentDashboardInner() {
  const params = useParams();
  const router = useRouter();
  const { currentPlayer } = useCurrentPlayer();
  const { tournament } = useTournament();
  const [players, setPlayers] = useState<Player[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [games, setGames] = useState<Record<string, { name: string; bannerUrl: string }>>({});
  const [isClosing, setIsClosing] = useState(false);

  const tournamentId = params.id as string;

  const loadData = useCallback(async () => {
    const [tRes, mRes, gRes] = await Promise.all([
      fetch(`/api/tournaments/${tournamentId}`),
      fetch(`/api/tournaments/${tournamentId}/matches`),
      fetch("/api/games"),
    ]);

    if (tRes.ok) {
      const tData = await tRes.json();
      setPlayers(tData.players || []);
      setLeaderboard(tData.leaderboard || []);
    }
    if (mRes.ok) {
      const mData = await mRes.json();
      setRecentMatches((mData.matches || []).slice(0, 5));
    }
    if (gRes.ok) {
      const gData = await gRes.json();
      const gMap: Record<string, { name: string; bannerUrl: string }> = {};
      for (const g of gData.games || []) gMap[g.id] = { name: g.name, bannerUrl: g.bannerUrl };
      setGames(gMap);
    }
  }, [tournamentId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Poll for updates every 10s
  useEffect(() => {
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));

  const isHost = tournament?.hostId === currentPlayer?.id;

  const handleCloseTournament = async () => {
    if (!confirm("¿Cerrar el torneo definitivamente?")) return;
    setIsClosing(true);
    await fetch(`/api/tournaments/${tournamentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "finished" }),
    });
    router.push(`/tournament/${tournamentId}/winner`);
  };

  const activeMatch = recentMatches.find((m) =>
    ["pending", "playing", "rating", "pending_validation", "disputed"].includes(m.status)
  );

  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1
              className="text-3xl md:text-4xl font-bold tracking-wider"
              style={{ fontFamily: "var(--font-heading)", color: "#FF6B00", textShadow: "0 0 15px rgba(255,107,0,0.4)" }}
            >
              {tournament?.name || "TORNEO"}
            </h1>
            <p className="text-zinc-500 text-xs mt-1 tracking-widest uppercase">
              Round-Robin Libre • {players.length} jugadores
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/tournament/${tournamentId}/bracket`)}
              className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
              title="Historial"
            >
              <History size={20} />
            </button>
            <button
              onClick={() => router.push("/tv")}
              className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
              title="TV Mode"
            >
              <Tv size={20} />
            </button>
            {isHost && (
              <button
                onClick={() => router.push("/admin")}
                className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
                title="Admin"
              >
                <Settings size={20} />
              </button>
            )}
          </div>
        </motion.div>

        {/* Active Match Banner */}
        <AnimatePresence>
          {activeMatch && (
            <motion.button
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => router.push(`/tournament/${tournamentId}/match/${activeMatch.id}`)}
              className="w-full mb-6 p-4 rounded-xl border border-orange-500/50 bg-orange-500/10 flex items-center justify-between hover:bg-orange-500/20 transition-colors"
              style={{ boxShadow: "0 0 20px rgba(255,107,0,0.15)" }}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-3 h-3 rounded-full bg-orange-500"
                />
                <div className="text-left">
                  <p className="text-orange-400 font-bold text-sm">PARTIDA EN CURSO</p>
                  <p className="text-zinc-300 text-xs">
                    {games[activeMatch.gameId]?.name || "..."} • {activeMatch.type.toUpperCase()} • Ronda {activeMatch.roundNumber}
                  </p>
                </div>
              </div>
              <ChevronRight size={20} className="text-orange-400" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Leaderboard */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="md:col-span-1 bg-zinc-900/80 border border-zinc-800 rounded-xl p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={16} className="text-orange-500" />
              <h2 className="text-sm font-bold tracking-widest uppercase text-zinc-300">
                Clasificación
              </h2>
            </div>
            <div className="space-y-3">
              {leaderboard.length === 0 && (
                <p className="text-zinc-600 text-sm text-center py-4">Sin partidas aún</p>
              )}
              {leaderboard.map((entry, index) => {
                const player = playerMap[entry.playerId];
                if (!player) return null;
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <motion.div
                    key={entry.playerId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <span className="text-lg w-8 text-center">
                      {medals[index] || `#${index + 1}`}
                    </span>
                    <span className="text-xl">{player.avatarEmoji}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm" style={{ color: player.colorHex }}>
                        {player.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {entry.matchesPlayed} partidas • {entry.wins} victorias
                      </p>
                    </div>
                    <span
                      className="font-bold text-xl"
                      style={{ fontFamily: "var(--font-mono)", color: index === 0 ? "#FF6B00" : "#fafafa" }}
                    >
                      {entry.totalScore}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 flex flex-col gap-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <Zap size={16} className="text-green-400" />
              <h2 className="text-sm font-bold tracking-widest uppercase text-zinc-300">
                Acciones
              </h2>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push(`/tournament/${tournamentId}/spin`)}
              className="w-full py-4 rounded-xl font-bold text-base tracking-widest uppercase flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, #FF6B00, #FF8C40)",
                color: "#09090b",
                boxShadow: "0 0 20px rgba(255,107,0,0.3)",
              }}
            >
              🎰 Girar Ruleta
            </motion.button>

            {activeMatch && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(`/tournament/${tournamentId}/match/${activeMatch.id}`)}
                className="w-full py-3 rounded-xl font-bold text-sm tracking-widest uppercase border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-zinc-950 transition-colors"
              >
                🎮 Ver Partida Activa
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push(`/tournament/${tournamentId}/bracket`)}
              className="w-full py-3 rounded-xl font-bold text-sm tracking-widest uppercase border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              📋 Historial de Partidas
            </motion.button>

            {isHost && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCloseTournament}
                disabled={isClosing}
                className="w-full py-3 rounded-xl font-bold text-sm tracking-widest uppercase border border-zinc-700 text-zinc-500 hover:border-red-500 hover:text-red-400 transition-colors mt-auto disabled:opacity-50"
              >
                {isClosing ? "Cerrando..." : "🏁 Cerrar Torneo"}
              </motion.button>
            )}
          </motion.div>
        </div>

        {/* Recent Matches */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Plus size={16} className="text-zinc-400" />
            <h2 className="text-sm font-bold tracking-widest uppercase text-zinc-300">
              Últimas Partidas
            </h2>
          </div>
          {recentMatches.length === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-6">
              Ninguna partida todavía. ¡Girá la ruleta!
            </p>
          ) : (
            <div className="space-y-2">
              {recentMatches.map((match) => {
                const statusColors: Record<string, string> = {
                  finished: "#00FF87",
                  playing: "#FF6B00",
                  disputed: "#ef4444",
                  cancelled: "#6b7280",
                  pending_validation: "#f59e0b",
                  rating: "#a78bfa",
                  pending: "#6b7280",
                };
                return (
                  <button
                    key={match.id}
                    onClick={() => router.push(`/tournament/${tournamentId}/match/${match.id}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-left"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: statusColors[match.status] || "#6b7280" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">
                        {games[match.gameId]?.name || "Juego"}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {match.type.toUpperCase()} • Ronda {match.roundNumber}
                        {match.isMemeMatch && " • 🎭 MEME"}
                      </p>
                    </div>
                    <span
                      className="text-xs font-medium uppercase"
                      style={{ color: statusColors[match.status] || "#6b7280" }}
                    >
                      {match.status.replace("_", " ")}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function TournamentPage() {
  const params = useParams();
  const tournamentId = params.id as string;
  return (
    <TournamentProvider tournamentId={tournamentId}>
      <TournamentDashboardInner />
    </TournamentProvider>
  );
}
