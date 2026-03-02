"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentPlayer } from "@/contexts/PlayerContext";
import { ChevronLeft, Eye, Star } from "lucide-react";

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
        fetch("/api/games")
          .then((r) => r.json())
          .then((gData) => {
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

  // Poll for reveals
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

  const StarButton = ({ value }: { value: number }) => (
    <motion.button
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => !hasSubmitted && setMyScore(value)}
      disabled={hasSubmitted}
      className="disabled:cursor-default"
    >
      <Star
        size={36}
        fill={value <= myScore ? "#FF6B00" : "transparent"}
        stroke={value <= myScore ? "#FF6B00" : "#3f3f46"}
        className="transition-colors"
      />
    </motion.button>
  );

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-zinc-800">
        <button
          onClick={() => router.push(`/tournament/${tournamentId}/match/${matchId}`)}
          className="text-zinc-400 hover:text-zinc-100"
        >
          <ChevronLeft size={24} />
        </button>
        <h1
          style={{ fontFamily: "var(--font-heading)", color: "#a78bfa" }}
          className="text-xl font-bold tracking-wider"
        >
          CALIFICACIÓN
        </h1>
        {game && (
          <span className="text-zinc-400 text-sm ml-auto">{game.name}</span>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center p-6 max-w-md mx-auto w-full gap-6">
        {/* Game Banner */}
        {game && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full rounded-2xl overflow-hidden"
            style={{ height: 120 }}
          >
            <img
              src={game.bannerUrl}
              alt={game.name}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/400x120/1a1a2e/a78bfa?text=${encodeURIComponent(game.name)}`; }}
            />
          </motion.div>
        )}

        {/* My Rating */}
        {!isRevealed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6"
          >
            <p className="text-xs text-zinc-400 tracking-widest uppercase mb-4 text-center">
              {hasSubmitted ? "Tu calificación" : "¿Cómo fue el juego?"}
            </p>

            {/* Star Rating */}
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                <StarButton key={v} value={v} />
              ))}
            </div>

            {myScore > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center mb-4"
              >
                <span
                  className="text-5xl font-bold"
                  style={{ fontFamily: "var(--font-mono)", color: "#FF6B00" }}
                >
                  {myScore}
                </span>
                <span className="text-zinc-500 text-xl">/10</span>
              </motion.div>
            )}

            {!hasSubmitted && (
              <>
                <textarea
                  value={myComment}
                  onChange={(e) => setMyComment(e.target.value)}
                  placeholder="Comentario opcional... (entre amigos)"
                  rows={2}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500 resize-none mb-4 transition-colors"
                />
                <button
                  onClick={handleSubmitRating}
                  disabled={isSubmitting || myScore === 0}
                  className="w-full py-3 rounded-xl font-bold text-sm tracking-widest uppercase disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
                    color: "white",
                    boxShadow: "0 0 20px rgba(167,139,250,0.3)",
                  }}
                >
                  {isSubmitting ? "Enviando..." : "⭐ Calificar"}
                </button>
              </>
            )}

            {hasSubmitted && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-purple-400 text-sm"
              >
                ✓ Calificación enviada (oculta hasta la revelación)
              </motion.p>
            )}
          </motion.div>
        )}

        {/* Waiting for votes / Reveal */}
        {!isRevealed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-zinc-400 tracking-widest uppercase">Estado de votos</p>
              <span className="text-sm font-bold" style={{ fontFamily: "var(--font-mono)" }}>
                <span className="text-purple-400">{ratings.length}</span>
                <span className="text-zinc-600">/{players.length}</span>
              </span>
            </div>
            <div className="flex gap-2">
              {players.map((player) => {
                const voted = ratings.some((r) => r.playerId === player.id);
                return (
                  <motion.div
                    key={player.id}
                    animate={voted ? { scale: [1, 1.2, 1] } : {}}
                    className="flex flex-col items-center gap-1"
                    title={player.name}
                  >
                    <span className="text-2xl">{player.avatarEmoji}</span>
                    <span className={`text-xs ${voted ? "text-purple-400" : "text-zinc-600"}`}>
                      {voted ? "✓" : "..."}
                    </span>
                  </motion.div>
                );
              })}
            </div>
            <button
              onClick={handleReveal}
              disabled={isRevealing}
              className="w-full mt-4 py-3 rounded-xl font-bold text-sm tracking-widest uppercase border border-purple-500 text-purple-400 hover:bg-purple-500/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isRevealing ? (
                "Revelando..."
              ) : (
                <>
                  <Eye size={16} /> Revelar Calificaciones
                  {!allVoted && " (forzar)"}
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* REVEALED RATINGS */}
        <AnimatePresence>
          {isRevealed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full space-y-4"
            >
              {/* Average score explosion */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
                className="text-center py-6 bg-zinc-900/80 border border-purple-500/30 rounded-2xl"
                style={{ boxShadow: "0 0 40px rgba(167,139,250,0.2)" }}
              >
                <p className="text-xs text-zinc-400 tracking-widest uppercase mb-2">Promedio</p>
                <span
                  className="text-7xl font-bold"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "#a78bfa",
                    textShadow: "0 0 30px rgba(167,139,250,0.5)",
                  }}
                >
                  {avgScore}
                </span>
                <span className="text-zinc-500 text-3xl">/10</span>
              </motion.div>

              {/* Individual ratings */}
              <div className="space-y-3">
                {ratings
                  .sort((a, b) => b.score - a.score)
                  .map((rating, index) => {
                    const player = playerMap[rating.playerId];
                    if (!player) return null;
                    return (
                      <motion.div
                        key={rating.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex items-center gap-4"
                      >
                        <span className="text-2xl">{player.avatarEmoji}</span>
                        <div className="flex-1">
                          <p className="font-semibold text-sm" style={{ color: player.colorHex }}>
                            {player.name}
                          </p>
                          {rating.comment && (
                            <p className="text-xs text-zinc-400 mt-1 italic">"{rating.comment}"</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Star size={16} fill="#FF6B00" stroke="#FF6B00" />
                          <span
                            className="text-xl font-bold text-orange-400"
                            style={{ fontFamily: "var(--font-mono)" }}
                          >
                            {rating.score}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>

              <button
                onClick={() => router.push(`/tournament/${tournamentId}`)}
                className="w-full py-3 rounded-xl font-bold text-sm tracking-widest uppercase"
                style={{
                  background: "linear-gradient(135deg, #FF6B00, #FF8C40)",
                  color: "#09090b",
                  boxShadow: "0 0 20px rgba(255,107,0,0.3)",
                }}
              >
                ← Volver al Dashboard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
