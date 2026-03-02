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

const CONFETTI_COLORS = ["#FF6B00", "#00FF87", "#FFD700", "#FF4655", "#4E9AF1", "#a78bfa"];

function Confetti() {
  const pieces = Array.from({ length: 60 }, (_, i) => i);
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {pieces.map((i) => (
        <motion.div
          key={i}
          initial={{
            x: `${Math.random() * 100}vw`,
            y: -20,
            rotate: 0,
            opacity: 1,
          }}
          animate={{
            y: "110vh",
            rotate: Math.random() * 720 - 360,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 3,
            delay: Math.random() * 2,
            ease: "linear",
          }}
          style={{
            position: "absolute",
            width: 8 + Math.random() * 8,
            height: 8 + Math.random() * 8,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            borderRadius: Math.random() > 0.5 ? "50%" : 2,
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

  const podiumOrder = [1, 0, 2]; // 2nd, 1st, 3rd visual order
  const podiumHeights = [200, 260, 160]; // heights for 2nd, 1st, 3rd

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-start pb-12 overflow-hidden">
      {showConfetti && <Confetti />}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pt-12 pb-8 px-6"
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="text-6xl mb-4"
        >
          🏆
        </motion.div>
        <h1
          className="text-4xl font-bold tracking-wider mb-2"
          style={{
            fontFamily: "var(--font-heading)",
            color: "#FFD700",
            textShadow: "0 0 30px rgba(255,215,0,0.5)",
          }}
        >
          {tournament?.name || "TORNEO"}
        </h1>
        <p className="text-zinc-400 text-sm tracking-widest uppercase">Resultados Finales</p>
      </motion.div>

      {/* Podium */}
      {top3.length >= 1 && (
        <div className="flex items-end gap-2 px-6 mb-10">
          {podiumOrder.map((rank, visualPos) => {
            const entry = top3[rank];
            if (!entry) return <div key={visualPos} style={{ width: 100 }} />;
            const player = playerMap[entry.playerId];
            if (!player) return null;
            const height = podiumHeights[visualPos];
            const medals = ["🥇", "🥈", "🥉"];

            return (
              <motion.div
                key={entry.playerId}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + visualPos * 0.2, type: "spring" }}
                className="flex flex-col items-center"
              >
                <motion.div
                  animate={rank === 0 ? { y: [0, -8, 0] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="flex flex-col items-center mb-2"
                >
                  <span className="text-3xl mb-1">{player.avatarEmoji}</span>
                  <span
                    className="font-bold text-sm text-center max-w-20"
                    style={{ color: player.colorHex }}
                  >
                    {player.name}
                  </span>
                  <span
                    className="font-bold text-xl mt-1"
                    style={{ fontFamily: "var(--font-mono)", color: "#FF6B00" }}
                  >
                    {entry.totalScore}
                  </span>
                </motion.div>
                <div
                  className="w-24 flex flex-col items-center justify-center rounded-t-xl border-t border-x"
                  style={{
                    height,
                    background:
                      rank === 0
                        ? "linear-gradient(to bottom, rgba(255,215,0,0.2), rgba(255,215,0,0.05))"
                        : rank === 1
                        ? "linear-gradient(to bottom, rgba(192,192,192,0.15), rgba(192,192,192,0.05))"
                        : "linear-gradient(to bottom, rgba(205,127,50,0.15), rgba(205,127,50,0.05))",
                    borderColor:
                      rank === 0 ? "rgba(255,215,0,0.4)" : rank === 1 ? "rgba(192,192,192,0.3)" : "rgba(205,127,50,0.3)",
                  }}
                >
                  <span className="text-3xl">{medals[rank]}</span>
                  <span className="text-lg font-bold text-zinc-400">#{rank + 1}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Rest of the table */}
      <div className="w-full max-w-md px-6 space-y-2">
        {rest.map((entry, index) => {
          const player = playerMap[entry.playerId];
          if (!player) return null;
          return (
            <motion.div
              key={entry.playerId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + index * 0.1 }}
              className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 rounded-xl p-3"
            >
              <span className="text-zinc-500 font-mono w-6 text-center">#{index + 4}</span>
              <span className="text-xl">{player.avatarEmoji}</span>
              <span className="flex-1 font-semibold text-sm" style={{ color: player.colorHex }}>
                {player.name}
              </span>
              <span
                className="font-bold text-lg"
                style={{ fontFamily: "var(--font-mono)", color: "#fafafa" }}
              >
                {entry.totalScore}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="mt-10 px-6 w-full max-w-md space-y-3"
      >
        <button
          onClick={() => router.push(`/tournament/${tournamentId}/bracket`)}
          className="w-full py-3 rounded-xl font-bold text-sm border border-zinc-700 text-zinc-300 hover:border-zinc-500 transition-colors"
        >
          📋 Ver Historial Completo
        </button>
        <button
          onClick={() => router.push("/lobby")}
          className="w-full py-3 rounded-xl font-bold text-sm tracking-widest uppercase"
          style={{
            background: "linear-gradient(135deg, #FF6B00, #FF8C40)",
            color: "#09090b",
            boxShadow: "0 0 20px rgba(255,107,0,0.3)",
          }}
        >
          🎮 Nuevo Torneo
        </button>
      </motion.div>
    </div>
  );
}
