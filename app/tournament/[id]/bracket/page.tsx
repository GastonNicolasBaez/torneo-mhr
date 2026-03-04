"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";

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

const STATUS_LABEL: Record<string, string> = {
  finished: "DONE",
  playing: "LIVE",
  pending_validation: "VAR",
  disputed: "DISPUTE",
  cancelled: "VOID",
  rating: "RATING",
  pending: "PENDING",
};

const STATUS_COLOR: Record<string, string> = {
  finished: "var(--accent-cyan)",
  playing: "#ffffff",
  pending_validation: "#facc15",
  disputed: "var(--accent-red)",
  cancelled: "#52525b",
  rating: "#a78bfa",
  pending: "#52525b",
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

  void players; // used for future player display

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
    <div className="min-h-screen bg-black pb-8">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-3 flex items-center justify-between sticky top-0 bg-black/90 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/tournament/${tournamentId}`)}
            className="tech-label hover:text-white transition-colors"
          >
            ← VOLVER
          </button>
          <span className="text-white/20 text-xs">|</span>
          <span className="tech-label" style={{ color: "var(--accent-cyan)" }}>▸ HISTORIAL</span>
        </div>
        <span className="terminal text-xs text-white/30">{finishedMatches.length} JUGADAS</span>
      </header>

      <div className="max-w-2xl mx-auto p-6 space-y-6">

        {/* Summary stats */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { label: "TOTAL", value: matches.length, color: "var(--accent-cyan)" },
            { label: "JUGADAS", value: finishedMatches.length, color: "rgba(255,255,255,0.7)" },
            { label: "ACTIVAS", value: activeMatches.length, color: "#facc15" },
          ].map((stat) => (
            <div key={stat.label} className="hud-panel p-4 text-center">
              <p className="terminal text-2xl font-bold" style={{ color: stat.color }}>
                {stat.value}
              </p>
              <p className="tech-label mt-1">{stat.label}</p>
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
              <div className="flex items-center gap-3 mb-3">
                <span className="tech-label">RONDA {round}</span>
                <div className="flex-1 h-px bg-white/8" />
                <span className="terminal text-xs text-white/20">{roundMatches.length}</span>
              </div>

              <div className="flex flex-col gap-1">
                {roundMatches.map((match) => (
                  <motion.button
                    key={match.id}
                    whileHover={{ x: 2 }}
                    onClick={() => router.push(`/tournament/${tournamentId}/match/${match.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 border border-white/8 hover:border-white/20 transition-colors text-left"
                  >
                    {/* Status bar */}
                    <span
                      className="w-1 h-4 flex-shrink-0"
                      style={{ background: STATUS_COLOR[match.status] ?? "#52525b" }}
                    />

                    {/* Game name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 truncate">
                        {games[match.gameId]?.name ?? "—"}
                        {match.isMemeMatch ? " 🎭" : ""}
                      </p>
                      <p className="terminal text-xs text-white/25 mt-0.5">
                        {match.type.toUpperCase()} •{" "}
                        {new Date(match.createdAt).toLocaleString("es-AR", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {/* Status label */}
                    <span
                      className="terminal text-xs w-16 text-right flex-shrink-0"
                      style={{ color: STATUS_COLOR[match.status] ?? "#52525b" }}
                    >
                      {STATUS_LABEL[match.status] ?? match.status}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ))}

        {matches.length === 0 && (
          <div className="text-center py-16">
            <p className="tech-label mb-2">SIN PARTIDAS</p>
            <p className="text-white/20 text-xs">Girá la ruleta para empezar</p>
          </div>
        )}
      </div>
    </div>
  );
}
