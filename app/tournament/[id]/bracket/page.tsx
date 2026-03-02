"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, CheckCircle, Clock, XCircle, AlertTriangle } from "lucide-react";

interface Match {
  id: string;
  gameId: string;
  type: string;
  status: string;
  roundNumber: number;
  isMemeMatch: boolean;
  createdAt: string;
  winnerId?: string;
}

interface Player {
  id: string;
  name: string;
  avatarEmoji: string;
  colorHex: string;
}

interface Game {
  id: string;
  name: string;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  finished: <CheckCircle size={14} className="text-green-400" />,
  playing: <Clock size={14} className="text-orange-400" />,
  pending_validation: <Clock size={14} className="text-amber-400" />,
  disputed: <AlertTriangle size={14} className="text-red-400" />,
  cancelled: <XCircle size={14} className="text-zinc-500" />,
  rating: <Clock size={14} className="text-purple-400" />,
  pending: <Clock size={14} className="text-zinc-500" />,
};

export default function BracketPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;

  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<Record<string, Game>>({});

  const loadData = useCallback(async () => {
    const [mRes, tRes, gRes] = await Promise.all([
      fetch(`/api/tournaments/${tournamentId}/matches`),
      fetch(`/api/tournaments/${tournamentId}`),
      fetch("/api/games"),
    ]);

    if (mRes.ok) {
      const mData = await mRes.json();
      setMatches(mData.matches || []);
    }
    if (tRes.ok) {
      const tData = await tRes.json();
      setPlayers(tData.players || []);
    }
    if (gRes.ok) {
      const gData = await gRes.json();
      const gMap: Record<string, Game> = {};
      for (const g of gData.games || []) gMap[g.id] = g;
      setGames(gMap);
    }
  }, [tournamentId]);

  useEffect(() => { loadData(); }, [loadData]);

  const finishedMatches = matches.filter((m) => m.status === "finished");
  const activeMatches = matches.filter((m) =>
    ["pending", "playing", "rating", "pending_validation", "disputed"].includes(m.status)
  );

  const roundGroups = matches.reduce<Record<number, Match[]>>((acc, m) => {
    if (!acc[m.roundNumber]) acc[m.roundNumber] = [];
    acc[m.roundNumber].push(m);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-zinc-950 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-zinc-800 sticky top-0 bg-zinc-950/90 backdrop-blur z-10">
        <button
          onClick={() => router.push(`/tournament/${tournamentId}`)}
          className="text-zinc-400 hover:text-zinc-100"
        >
          <ChevronLeft size={24} />
        </button>
        <h1
          style={{ fontFamily: "var(--font-heading)", color: "#FF6B00" }}
          className="text-xl font-bold tracking-wider"
        >
          HISTORIAL
        </h1>
        <span className="text-zinc-500 text-sm ml-auto">
          {finishedMatches.length} partidas jugadas
        </span>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { label: "Total", value: matches.length, color: "#FF6B00" },
            { label: "Jugadas", value: finishedMatches.length, color: "#00FF87" },
            { label: "Activas", value: activeMatches.length, color: "#f59e0b" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 text-center"
            >
              <p
                className="text-2xl font-bold"
                style={{ fontFamily: "var(--font-mono)", color: stat.color }}
              >
                {stat.value}
              </p>
              <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Match list by round */}
        {Object.entries(roundGroups)
          .sort(([a], [b]) => parseInt(b) - parseInt(a))
          .map(([round, roundMatches]) => (
            <motion.div
              key={round}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <p className="text-xs text-zinc-500 tracking-widest uppercase mb-3 flex items-center gap-2">
                <span className="w-6 h-px bg-zinc-700" />
                Ronda {round}
                <span className="w-6 h-px bg-zinc-700" />
              </p>
              <div className="space-y-2">
                {roundMatches.map((match) => (
                  <motion.button
                    key={match.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() =>
                      router.push(`/tournament/${tournamentId}/match/${match.id}`)
                    }
                    className="w-full flex items-center gap-3 p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl hover:border-zinc-600 transition-colors text-left"
                  >
                    {STATUS_ICONS[match.status] || STATUS_ICONS.pending}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-zinc-200 truncate">
                        {games[match.gameId]?.name || "Juego"}
                        {match.isMemeMatch && " 🎭"}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {match.type.toUpperCase()} •{" "}
                        {new Date(match.createdAt).toLocaleString("es-AR", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span
                      className="text-xs uppercase font-medium px-2 py-1 rounded"
                      style={{
                        background:
                          match.status === "finished"
                            ? "rgba(0,255,135,0.1)"
                            : match.status === "cancelled"
                            ? "rgba(107,114,128,0.1)"
                            : "rgba(255,107,0,0.1)",
                        color:
                          match.status === "finished"
                            ? "#00FF87"
                            : match.status === "cancelled"
                            ? "#6b7280"
                            : "#FF6B00",
                      }}
                    >
                      {match.status.replace("_", " ")}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ))}

        {matches.length === 0 && (
          <div className="text-center py-16">
            <p className="text-zinc-600 text-4xl mb-4">🎮</p>
            <p className="text-zinc-500">Sin partidas todavía. ¡Girá la ruleta!</p>
          </div>
        )}
      </div>
    </div>
  );
}
