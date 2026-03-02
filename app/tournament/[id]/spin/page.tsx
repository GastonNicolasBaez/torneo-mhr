"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, RefreshCw, Ban } from "lucide-react";

interface Game {
  id: string;
  name: string;
  bannerUrl: string;
  isAvailable1v1: boolean;
  isAvailableFFA: boolean;
  isAvailable2v2: boolean;
  isBO3Preferred: boolean;
  isLongGame: boolean;
}

type ModalityType = "v1v1" | "ffa" | "v2v2";

const ITEM_HEIGHT = 88;
const COPIES = 20;

export default function SpinPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;

  const [allGames, setAllGames] = useState<Game[]>([]);
  const [vetoed, setVetoed] = useState<string[]>([]);
  const [playerVeto, setPlayerVeto] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);

  const [stripY, setStripY] = useState(0);
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/games")
      .then((r) => r.json())
      .then((data) => setAllGames(data.games || []));
  }, []);

  // All non-vetoed games go into the roulette (no modality filter)
  const availableGames = allGames.filter((g) => !vetoed.includes(g.id));

  const handleVeto = (gameId: string) => {
    if (playerVeto && playerVeto !== gameId) return;
    if (playerVeto === gameId) {
      setVetoed((prev) => prev.filter((id) => id !== gameId));
      setPlayerVeto(null);
    } else {
      setVetoed((prev) => [...prev, gameId]);
      setPlayerVeto(gameId);
    }
  };

  const handleSpin = () => {
    if (availableGames.length === 0 || isSpinning) return;

    setIsSpinning(true);
    setSelectedGame(null);

    const n = availableGames.length;
    const winnerIndex = Math.floor(Math.random() * n);
    const winner = availableGames[winnerIndex];

    const CONTAINER_CENTER = 160;
    const extraScrollRounds = Math.floor(COPIES / 2);
    const extraScroll = extraScrollRounds * n * ITEM_HEIGHT;

    const targetY =
      CONTAINER_CENTER - (winnerIndex * ITEM_HEIGHT + ITEM_HEIGHT / 2) - extraScroll;

    const startY = stripY;
    const distance = targetY - startY;
    const duration = 3500;
    const startTime = performance.now();

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOut(progress);
      const currentY = startY + distance * eased;
      setStripY(currentY);

      if (progress < 1) {
        animRef.current = setTimeout(() => requestAnimationFrame(tick), 16);
      } else {
        setStripY(targetY);
        setIsSpinning(false);
        setSelectedGame(winner);
      }
    };

    requestAnimationFrame(tick);
  };

  const handleReset = () => {
    setSelectedGame(null);
    setStripY(0);
  };

  const handleConfirmModality = async (modality: ModalityType) => {
    if (!selectedGame) return;
    setIsCreatingMatch(true);

    if (modality === "ffa") {
      // FFA: create a single match and go to match hub
      const res = await fetch(`/api/tournaments/${tournamentId}/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: selectedGame.id,
          type: "ffa",
          roundNumber: 1,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        await fetch(`/api/matches/${data.match.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "playing" }),
        });
        router.push(`/tournament/${tournamentId}/match/${data.match.id}`);
      }
    } else {
      // 1v1 or 2v2: create a league session
      const res = await fetch(`/api/tournaments/${tournamentId}/game-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: selectedGame.id,
          type: modality,
          roundNumber: 1,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/tournament/${tournamentId}/league/${data.session.id}`);
      }
    }

    setIsCreatingMatch(false);
  };

  // Build the infinite strip
  const stripItems =
    availableGames.length > 0
      ? Array.from({ length: COPIES }, (_, copy) =>
          availableGames.map((g) => ({ ...g, _key: `${copy}-${g.id}` }))
        ).flat()
      : [];

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-zinc-800">
        <button
          onClick={() => router.push(`/tournament/${tournamentId}`)}
          className="text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h1
          className="text-2xl font-bold tracking-widest"
          style={{ fontFamily: "var(--font-heading)", color: "#FF6B00" }}
        >
          RULETA
        </h1>
        <span className="text-zinc-500 text-sm ml-auto">
          {availableGames.length} juegos disponibles
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start p-6 gap-6">
        {/* Roulette wheel */}
        <div className="w-full max-w-sm">
          <div
            className="relative rounded-2xl border border-zinc-800 bg-zinc-900"
            style={{ height: 320, overflow: "hidden" }}
          >
            {/* Orange selector highlight (center) */}
            <div
              className="absolute inset-x-0 z-10 pointer-events-none"
              style={{
                top: "50%",
                transform: "translateY(-50%)",
                height: ITEM_HEIGHT,
                border: "2px solid #FF6B00",
                boxShadow:
                  "0 0 24px rgba(255,107,0,0.5), inset 0 0 20px rgba(255,107,0,0.08)",
                borderRadius: 10,
              }}
            />
            {/* Fade top */}
            <div
              className="absolute inset-x-0 top-0 z-10 pointer-events-none"
              style={{
                height: 100,
                background:
                  "linear-gradient(to bottom, #09090b 10%, transparent)",
              }}
            />
            {/* Fade bottom */}
            <div
              className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
              style={{
                height: 100,
                background: "linear-gradient(to top, #09090b 10%, transparent)",
              }}
            />

            {availableGames.length === 0 ? (
              <div className="flex items-center justify-center h-full text-zinc-500 text-sm px-4 text-center">
                No hay juegos disponibles
              </div>
            ) : (
              <div
                className="absolute inset-x-0"
                style={{
                  top: 0,
                  transform: `translateY(${stripY}px)`,
                  willChange: "transform",
                }}
              >
                {stripItems.map((game) => (
                  <div
                    key={game._key}
                    className="flex items-center gap-3 px-4"
                    style={{ height: ITEM_HEIGHT }}
                  >
                    <img
                      src={game.bannerUrl}
                      alt={game.name}
                      className="w-16 h-11 rounded-lg object-cover flex-shrink-0 bg-zinc-800"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://placehold.co/64x44/1a1a2e/FF6B00?text=${encodeURIComponent(game.name.slice(0, 2))}`;
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-zinc-100 font-semibold text-sm leading-tight truncate">
                        {game.name}
                      </p>
                      <div className="flex gap-1 mt-0.5">
                        {game.isBO3Preferred && !game.isLongGame && (
                          <span className="text-xs text-zinc-500">BO3</span>
                        )}
                        {game.isLongGame && (
                          <span className="text-xs text-amber-500">⏱</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Spin button */}
        {!selectedGame && (
          <motion.button
            whileHover={{ scale: isSpinning ? 1 : 1.05 }}
            whileTap={{ scale: isSpinning ? 1 : 0.95 }}
            onClick={handleSpin}
            disabled={isSpinning || availableGames.length === 0}
            className="px-12 py-4 rounded-xl font-bold text-xl tracking-widest uppercase disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #FF6B00, #FF8C40)",
              color: "#09090b",
              boxShadow: "0 0 30px rgba(255,107,0,0.4)",
            }}
          >
            {isSpinning ? (
              <motion.span
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
              >
                Girando...
              </motion.span>
            ) : (
              "🎰 ¡GIRAR!"
            )}
          </motion.button>
        )}

        {/* Result card with modality selection */}
        <AnimatePresence>
          {selectedGame && !isSpinning && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="w-full max-w-sm bg-zinc-900 border border-orange-500/50 rounded-2xl p-6 flex flex-col items-center gap-4"
              style={{ boxShadow: "0 0 40px rgba(255,107,0,0.2)" }}
            >
              <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ repeat: Infinity, duration: 2.5 }}
                className="w-full"
              >
                <img
                  src={selectedGame.bannerUrl}
                  alt={selectedGame.name}
                  className="w-full h-32 rounded-xl object-cover bg-zinc-800"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://placehold.co/320x128/1a1a2e/FF6B00?text=${encodeURIComponent(selectedGame.name)}`;
                  }}
                />
              </motion.div>

              <div className="text-center w-full">
                <p className="text-orange-400 text-xs tracking-widest uppercase mb-1">
                  Juego Seleccionado
                </p>
                <h2
                  className="text-2xl font-bold text-zinc-100"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {selectedGame.name}
                </h2>
                <div className="flex gap-2 justify-center mt-2">
                  {selectedGame.isBO3Preferred && !selectedGame.isLongGame && (
                    <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded">
                      BO3
                    </span>
                  )}
                  {selectedGame.isLongGame && (
                    <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded">
                      ⏱ Juego Largo
                    </span>
                  )}
                </div>
              </div>

              {/* Modality selection */}
              <div className="w-full">
                <p className="text-zinc-500 text-xs tracking-widest uppercase text-center mb-3">
                  Elegir modalidad
                </p>
                <div className="flex gap-2 w-full">
                  {selectedGame.isAvailable1v1 && (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleConfirmModality("v1v1")}
                      disabled={isCreatingMatch}
                      className="flex-1 py-3 rounded-xl font-bold text-sm tracking-wider disabled:opacity-50 transition-all border border-zinc-700 text-zinc-200 hover:border-orange-500 hover:text-orange-400"
                    >
                      1v1
                      <span className="block text-xs font-normal text-zinc-500 mt-0.5">Liga</span>
                    </motion.button>
                  )}
                  {selectedGame.isAvailableFFA && (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleConfirmModality("ffa")}
                      disabled={isCreatingMatch}
                      className="flex-1 py-3 rounded-xl font-bold text-sm tracking-wider disabled:opacity-50 transition-all"
                      style={{
                        background: "linear-gradient(135deg, #00FF87, #00CC6A)",
                        color: "#09090b",
                        boxShadow: "0 0 20px rgba(0,255,135,0.3)",
                      }}
                    >
                      FFA
                      <span className="block text-xs font-normal opacity-70 mt-0.5">Todos vs Todos</span>
                    </motion.button>
                  )}
                  {selectedGame.isAvailable2v2 && (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleConfirmModality("v2v2")}
                      disabled={isCreatingMatch}
                      className="flex-1 py-3 rounded-xl font-bold text-sm tracking-wider disabled:opacity-50 transition-all border border-zinc-700 text-zinc-200 hover:border-blue-500 hover:text-blue-400"
                    >
                      2v2
                      <span className="block text-xs font-normal text-zinc-500 mt-0.5">Liga</span>
                    </motion.button>
                  )}
                </div>

                {isCreatingMatch && (
                  <p className="text-center text-zinc-400 text-sm mt-3 animate-pulse">
                    Iniciando...
                  </p>
                )}
              </div>

              <button
                onClick={handleReset}
                className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
              >
                <RefreshCw size={14} />
                Girar de nuevo
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Veto section */}
        {!selectedGame && !isSpinning && availableGames.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-sm"
          >
            <p className="text-xs text-zinc-500 tracking-widest uppercase mb-3 flex items-center gap-2">
              <Ban size={12} />
              Vetar juego (1 por jugador)
              {playerVeto && (
                <span className="text-orange-500">• 1 veto usado</span>
              )}
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {availableGames.map((game) => (
                <button
                  key={game.id}
                  onClick={() => handleVeto(game.id)}
                  disabled={!!playerVeto && playerVeto !== game.id}
                  className={`text-xs p-2 rounded-lg border transition-all text-left truncate disabled:opacity-30 ${
                    playerVeto === game.id
                      ? "border-red-500 bg-red-500/10 text-red-400"
                      : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
                  }`}
                >
                  {playerVeto === game.id && "🚫 "}
                  {game.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
