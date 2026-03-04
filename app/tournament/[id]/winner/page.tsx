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

interface LeaderboardEntry {
  playerId: string;
  totalScore: number;
  wins: number;
  matchesPlayed: number;
}

const CONFETTI_COLORS = ["var(--accent-cyan)", "#a78bfa", "#facc15", "var(--accent-red)", "#ffffff", "#60a5fa"];

function Confetti() {
  const pieces = Array.from({ length: 50 }, (_, i) => i);
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {pieces.map((i) => (
        <motion.div
          key={i}
          initial={{ x: `${Math.random() * 100}vw`, y: -20, rotate: 0, opacity: 1 }}
          animate={{ y: "110vh", rotate: Math.random() * 720 - 360, opacity: [1, 1, 0] }}
          transition={{ duration: 3 + Math.random() * 3, delay: Math.random() * 2, ease: "linear" }}
          style={{
            position: "absolute",
            width: 4 + Math.random() * 6,
            height: 4 + Math.random() * 6,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          }}
        />
      ))}
    </div>
  );
}

export default function WinnerPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;

  const [players, setPlayers] = useState<Player[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tournament, setTournament] = useState<{ name: string; hostId: string } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const loadData = useCallback(async () => {
    const res = await fetch(`/api/tournaments/${tournamentId}`);
    if (res.ok) {
      const data = await res.json();
      setPlayers(data.players || []);
      setLeaderboard(data.leaderboard || []);
      setTournament(data.tournament);
    }
  }, [tournamentId]);

  useEffect(() => {
    loadData().then(() => {
      setTimeout(() => setShowConfetti(true), 500);
    });
  }, [loadData]);

  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  // 2nd, 1st, 3rd visual order
  const podiumOrder = [1, 0, 2];
  const podiumHeights = [180, 240, 140];
  const podiumColors = [
    "rgba(192,192,192,0.15)",
    "rgba(0,240,255,0.1)",
    "rgba(205,127,50,0.12)",
  ];
  const podiumBorders = [
    "rgba(192,192,192,0.3)",
    "rgba(0,240,255,0.4)",
    "rgba(205,127,50,0.3)",
  ];
  const rankLabels = ["01", "02", "03"];

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-start pb-12 overflow-hidden">
      {showConfetti && <Confetti />}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pt-12 pb-8 px-6"
      >
        <p className="tech-label mb-3" style={{ color: "var(--accent-cyan)" }}>
          ▸ RESULTADO FINAL
        </p>
        <h1
          className="text-5xl font-bold tracking-widest"
          style={{
            fontFamily: "var(--font-heading)",
            color: "var(--accent-cyan)",
            textShadow: "0 0 40px rgba(0,240,255,0.3)",
          }}
        >
          {tournament?.name || "TORNEO"}
        </h1>
        <div className="h-px w-32 mx-auto mt-4" style={{ background: "var(--accent-cyan)" }} />
      </motion.div>

      {/* Podium */}
      {top3.length >= 1 && (
        <div className="flex items-end gap-2 px-6 mb-10">
          {podiumOrder.map((rank, visualPos) => {
            const entry = top3[rank];
            if (!entry) return <div key={visualPos} style={{ width: 96 }} />;
            const player = playerMap[entry.playerId];
            if (!player) return null;
            const height = podiumHeights[visualPos];
            const medals = ["🥇", "🥈", "🥉"];

            return (
              <motion.div
                key={entry.playerId}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + visualPos * 0.15, type: "spring", stiffness: 200 }}
                className="flex flex-col items-center"
              >
                {/* Player info above podium */}
                <motion.div
                  animate={rank === 0 ? { y: [0, -6, 0] } : {}}
                  transition={{ repeat: Infinity, duration: 2.5 }}
                  className="flex flex-col items-center mb-2"
                >
                  <span className="text-3xl mb-1">{player.avatarEmoji}</span>
                  <span className="terminal text-xs font-bold text-center max-w-20" style={{ color: player.colorHex }}>
                    {player.name.toUpperCase()}
                  </span>
                  <span
                    className="terminal text-lg font-bold mt-1"
                    style={{ color: rank === 0 ? "var(--accent-cyan)" : "rgba(255,255,255,0.7)" }}
                  >
                    {entry.totalScore}
                  </span>
                </motion.div>

                {/* Podium block */}
                <div
                  className="w-24 flex flex-col items-center justify-start pt-3 border-t border-x"
                  style={{
                    height,
                    background: podiumColors[visualPos],
                    borderColor: podiumBorders[visualPos],
                  }}
                >
                  <span className="text-2xl">{medals[rank]}</span>
                  <span className="terminal text-xs text-white/30 mt-1">#{rankLabels[rank]}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Rest of table */}
      {rest.length > 0 && (
        <div className="w-full max-w-md px-6 flex flex-col gap-1">
          {rest.map((entry, index) => {
            const player = playerMap[entry.playerId];
            if (!player) return null;
            return (
              <motion.div
                key={entry.playerId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + index * 0.08 }}
                className="flex items-center gap-3 border border-white/8 px-4 py-3"
              >
                <span className="terminal text-xs text-white/30 w-6">#{index + 4}</span>
                <span className="text-lg">{player.avatarEmoji}</span>
                <span className="flex-1 terminal text-sm" style={{ color: player.colorHex }}>
                  {player.name.toUpperCase()}
                </span>
                <span className="terminal text-sm font-bold text-white/70">
                  {entry.totalScore}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mt-10 px-6 w-full max-w-md flex flex-col gap-2"
        >
          <button
            onClick={() => router.push(`/tournament/${tournamentId}/bracket`)}
            className="w-full py-3 border border-white/15 tech-label hover:border-white/30 hover:text-white transition-colors"
          >
            VER HISTORIAL COMPLETO →
          </button>
          <button
            onClick={() => router.push("/lobby")}
            className="w-full py-4 font-bold text-sm tracking-widest uppercase transition-all"
            style={{
              background: "var(--accent-cyan)",
              color: "#000",
              border: "1px solid var(--accent-cyan)",
            }}
          >
            ▸ NUEVO TORNEO
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
