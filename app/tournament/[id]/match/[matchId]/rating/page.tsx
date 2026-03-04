"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentPlayer } from "@/contexts/PlayerContext";

interface GameRating {
  id: string;
  playerId: string;
  score: number;
  comment?: string;
  isRevealed: boolean;
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
  bannerUrl: string;
}

export default function RatingPage() {
  const params = useParams();
  const router = useRouter();
  const { currentPlayer } = useCurrentPlayer();
  const tournamentId = params.id as string;
  const matchId = params.matchId as string;

  const [ratings, setRatings] = useState<GameRating[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [game, setGame] = useState<Game | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const loadData = useCallback(async () => {
    const [rRes, mRes, tRes] = await Promise.all([
      fetch(`/api/matches/${matchId}/ratings`),
      fetch(`/api/matches/${matchId}`),
      fetch(`/api/tournaments/${tournamentId}`),
    ]);

    if (rRes.ok) {
      const rData = await rRes.json();
      const ratingsList = rData.ratings || [];
      setRatings(ratingsList);
      const myRating = ratingsList.find((r: GameRating) => r.playerId === currentPlayer?.id);
      if (myRating) {
        setHasSubmitted(true);
        setMyScore(myRating.score);
        setMyComment(myRating.comment || "");
      }
    }
    if (mRes.ok) {
      const mData = await mRes.json();
      if (mData.match?.gameId) {
        fetch("/api/games").then((r) => r.json()).then((gData) => {
          const g = gData.games?.find((g: Game) => g.id === mData.match.gameId);
          if (g) setGame(g);
        });
      }
    }
    if (tRes.ok) {
      const tData = await tRes.json();
      setPlayers(tData.players || []);
    }
  }, [matchId, tournamentId, currentPlayer?.id]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [loadData]);

  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));
  const isRevealed = ratings.some((r) => r.isRevealed);
  const allVoted = players.length > 0 && ratings.length >= players.length;
  const avgScore = ratings.length > 0
    ? (ratings.reduce((s, r) => s + r.score, 0) / ratings.length).toFixed(1)
    : null;

  const handleSubmitRating = async () => {
    if (myScore === 0) return;
    setIsSubmitting(true);
    await fetch(`/api/matches/${matchId}/ratings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: myScore, comment: myComment }),
    });
    setHasSubmitted(true);
    await loadData();
    setIsSubmitting(false);
  };

  const handleReveal = async () => {
    if (!allVoted && !confirm("No todos votaron. ¿Revelar igual?")) return;
    setIsRevealing(true);
    await fetch(`/api/matches/${matchId}/ratings/reveal`, { method: "POST" });
    await loadData();
    setIsRevealing(false);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/tournament/${tournamentId}/match/${matchId}`)}
            className="tech-label hover:text-white transition-colors"
          >
            ← VOLVER
          </button>
          <span className="text-white/20 text-xs">|</span>
          <span className="tech-label" style={{ color: "#a78bfa" }}>▸ CALIFICACIÓN</span>
        </div>
        {game && <span className="terminal text-xs text-white/30">{game.name.toUpperCase()}</span>}
      </header>

      <div className="flex-1 flex flex-col items-center p-6 max-w-md mx-auto w-full gap-5">

        {/* My Rating */}
        {!isRevealed && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full hud-panel p-6"
          >
            <p className="tech-label mb-5 text-center">
              {hasSubmitted ? "TU CALIFICACIÓN" : "¿CÓMO FUE EL JUEGO?"}
            </p>

            {/* Score buttons */}
            <div className="grid grid-cols-5 gap-1.5 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                <motion.button
                  key={v}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => !hasSubmitted && setMyScore(v)}
                  disabled={hasSubmitted}
                  className="py-2 border text-center transition-all disabled:cursor-default"
                  style={{
                    borderColor: v <= myScore ? "#a78bfa" : "rgba(255,255,255,0.08)",
                    background: v <= myScore ? "rgba(167,139,250,0.1)" : "transparent",
                    color: v <= myScore ? "#a78bfa" : "rgba(255,255,255,0.3)",
                  }}
                >
                  <span className="terminal text-xs font-bold">{v}</span>
                </motion.button>
              ))}
            </div>

            {myScore > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center mb-4"
              >
                <span className="terminal text-5xl font-bold" style={{ color: "#a78bfa" }}>
                  {myScore}
                </span>
                <span className="text-white/30 text-xl">/10</span>
              </motion.div>
            )}

            {!hasSubmitted && (
              <>
                <textarea
                  value={myComment}
                  onChange={(e) => setMyComment(e.target.value)}
                  placeholder="Comentario opcional..."
                  rows={2}
                  className="w-full bg-black border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#a78bfa] resize-none mb-4 transition-colors terminal"
                />
                <button
                  onClick={handleSubmitRating}
                  disabled={isSubmitting || myScore === 0}
                  className="w-full py-3 font-bold text-sm tracking-widest uppercase transition-all disabled:opacity-30"
                  style={{
                    background: myScore > 0 ? "#a78bfa" : "transparent",
                    color: myScore > 0 ? "#000" : "#a78bfa",
                    border: "1px solid #a78bfa",
                  }}
                >
                  {isSubmitting ? "ENVIANDO..." : "⭐ CALIFICAR"}
                </button>
              </>
            )}

            {hasSubmitted && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="terminal text-xs text-center"
                style={{ color: "#a78bfa" }}
              >
                ✓ CALIFICACIÓN ENVIADA — OCULTA HASTA LA REVELACIÓN
              </motion.p>
            )}
          </motion.div>
        )}

        {/* Vote status + Reveal */}
        {!isRevealed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full hud-panel p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="tech-label">ESTADO DE VOTOS</p>
              <span className="terminal text-xs">
                <span style={{ color: "#a78bfa" }}>{ratings.length}</span>
                <span className="text-white/20">/{players.length}</span>
              </span>
            </div>
            <div className="flex gap-3 mb-4">
              {players.map((player) => {
                const voted = ratings.some((r) => r.playerId === player.id);
                return (
                  <motion.div
                    key={player.id}
                    animate={voted ? { scale: [1, 1.2, 1] } : {}}
                    className="flex flex-col items-center gap-1"
                  >
                    <span className="text-xl">{player.avatarEmoji}</span>
                    <span className="terminal text-xs" style={{ color: voted ? "#a78bfa" : "rgba(255,255,255,0.2)" }}>
                      {voted ? "✓" : "·"}
                    </span>
                  </motion.div>
                );
              })}
            </div>
            <button
              onClick={handleReveal}
              disabled={isRevealing}
              className="w-full py-3 font-bold text-sm tracking-widest uppercase border transition-all disabled:opacity-40"
              style={{ borderColor: "#a78bfa", color: "#a78bfa" }}
            >
              {isRevealing ? "REVELANDO..." : `▸ REVELAR${!allVoted ? " (FORZAR)" : ""}`}
            </button>
          </motion.div>
        )}

        {/* Revealed Ratings */}
        <AnimatePresence>
          {isRevealed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full flex flex-col gap-4"
            >
              {/* Average score */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="hud-panel p-6 text-center"
                style={{ borderColor: "rgba(167,139,250,0.4)" }}
              >
                <p className="tech-label mb-2">PROMEDIO FINAL</p>
                <span
                  className="terminal text-7xl font-bold"
                  style={{
                    color: "#a78bfa",
                    textShadow: "0 0 30px rgba(167,139,250,0.4)",
                  }}
                >
                  {avgScore}
                </span>
                <span className="text-white/25 text-3xl">/10</span>
              </motion.div>

              {/* Individual ratings */}
              <div className="flex flex-col gap-1">
                {ratings
                  .sort((a, b) => b.score - a.score)
                  .map((rating, index) => {
                    const player = playerMap[rating.playerId];
                    if (!player) return null;
                    return (
                      <motion.div
                        key={rating.id}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.08 }}
                        className="hud-panel px-4 py-3 flex items-center gap-3"
                      >
                        <span className="text-xl">{player.avatarEmoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="terminal text-xs font-bold" style={{ color: player.colorHex }}>
                            {player.name.toUpperCase()}
                          </p>
                          {rating.comment && (
                            <p className="text-xs text-white/30 mt-0.5 italic truncate">"{rating.comment}"</p>
                          )}
                        </div>
                        <span className="terminal text-xl font-bold" style={{ color: "#a78bfa" }}>
                          {rating.score}
                        </span>
                      </motion.div>
                    );
                  })}
              </div>

              <button
                onClick={() => router.push(`/tournament/${tournamentId}`)}
                className="w-full py-4 font-bold text-sm tracking-widest uppercase transition-all"
                style={{
                  background: "var(--accent-cyan)",
                  color: "#000",
                  border: "1px solid var(--accent-cyan)",
                }}
              >
                ← VOLVER AL DASHBOARD
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
