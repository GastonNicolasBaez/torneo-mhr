"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentPlayer } from "@/contexts/PlayerContext";

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
  const { currentPlayer, setCurrentPlayer } = useCurrentPlayer();
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

  const handleLogout = async () => {
    await fetch("/api/session", { method: "DELETE" });
    setCurrentPlayer(null);
    router.push("/select-player");
  };

  const handleConfirmModality = async (modality: ModalityType) => {
    if (!selectedGame) return;
    setIsCreatingMatch(true);

    if (modality === "ffa") {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: selectedGame.id, type: "ffa", roundNumber: 1 }),
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
      const res = await fetch(`/api/tournaments/${tournamentId}/game-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
body: JSON.stringify({ gameId: selectedGame.id, type: modality, roundNumber: 1 }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/tournament/${tournamentId}/league/${data.session.id}`);
      }
    }

    setIsCreatingMatch(false);
  };

  const stripItems =
    availableGames.length > 0
      ? Array.from({ length: COPIES }, (_, copy) =>
          availableGames.map((g) => ({ ...g, _key: `${copy}-${g.id}` }))
        ).flat()
      : [];

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/tournament/${tournamentId}`)}
            className="tech-label hover:text-white transition-colors"
          >
            ← VOLVER
          </button>
          <span className="text-white/20 text-xs">|</span>
          <span className="tech-label" style={{ color: "var(--accent-cyan)" }}>▸ RULETA</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="terminal text-xs text-white/30">{availableGames.length} JUEGOS</span>
          {currentPlayer && (
            <div className="flex items-center gap-3">
              <span className="tech-label">{currentPlayer.avatarEmoji} <span style={{ color: currentPlayer.colorHex }}>{currentPlayer.name}</span></span>
              <button onClick={handleLogout} className="tech-label hover:text-white transition-colors">[SALIR]</button>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-start p-6 gap-6">

        {/* Roulette wheel */}
        <div className="w-full max-w-sm">
          <div
            className="relative border border-white/10"
            style={{ height: 320, overflow: "hidden", background: "#050505" }}
          >
            {/* Cyan selector highlight */}
            <div
              className="absolute inset-x-0 z-10 pointer-events-none"
              style={{
                top: "50%",
                transform: "translateY(-50%)",
                height: ITEM_HEIGHT,
                border: "1px solid var(--accent-cyan)",
                boxShadow: "0 0 20px rgba(0,240,255,0.15), inset 0 0 20px rgba(0,240,255,0.05)",
              }}
            />
            {/* Fade top */}
            <div
              className="absolute inset-x-0 top-0 z-10 pointer-events-none"
              style={{ height: 100, background: "linear-gradient(to bottom, #000 10%, transparent)" }}
            />
            {/* Fade bottom */}
            <div
              className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
              style={{ height: 100, background: "linear-gradient(to top, #000 10%, transparent)" }}
            />

            {availableGames.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="tech-label">SIN JUEGOS</p>
              </div>
            ) : (
              <div
                className="absolute inset-x-0"
                style={{ top: 0, transform: `translateY(${stripY}px)`, willChange: "transform" }}
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
                      className="w-16 h-11 object-cover flex-shrink-0"
                      style={{ background: "#111" }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://placehold.co/64x44/111/00f0ff?text=${encodeURIComponent(game.name.slice(0, 2))}`;
                      }}
                    />
                    <div className="min-w-0">
                      <p className="terminal text-sm text-white truncate">{game.name}</p>
                      <div className="flex gap-2 mt-0.5">
                        {game.isBO3Preferred && !game.isLongGame && (
                          <span className="tech-label" style={{ color: "var(--accent-cyan)" }}>BO3</span>
                        )}
                        {game.isLongGame && (
                          <span className="tech-label text-amber-500">LARGO</span>
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
            whileTap={{ scale: isSpinning ? 1 : 0.97 }}
            onClick={handleSpin}
            disabled={isSpinning || availableGames.length === 0}
            className="px-12 py-4 font-bold text-base tracking-widest uppercase disabled:opacity-40 transition-all"
            style={{
              background: isSpinning ? "transparent" : "var(--accent-cyan)",
              color: isSpinning ? "var(--accent-cyan)" : "#000",
              border: "1px solid var(--accent-cyan)",
            }}
          >
            {isSpinning ? (
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
              >
                GIRANDO...
              </motion.span>
            ) : (
              "▸ GIRAR RULETA"
            )}
          </motion.button>
        )}

        {/* Result card */}
        <AnimatePresence>
          {selectedGame && !isSpinning && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-sm hud-panel p-6 flex flex-col gap-5"
            >
              <div>
                <p className="tech-label mb-2" style={{ color: "var(--accent-cyan)" }}>
                  ▸ JUEGO SELECCIONADO
                </p>
                <h2
                  className="text-2xl font-bold tracking-widest"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {selectedGame.name}
                </h2>
                <div className="flex gap-3 mt-2">
                  {selectedGame.isBO3Preferred && !selectedGame.isLongGame && (
                    <span className="tech-label" style={{ color: "var(--accent-cyan)" }}>BO3</span>
                  )}
                  {selectedGame.isLongGame && (
                    <span className="tech-label text-amber-500">⏱ LARGO</span>
                  )}
                </div>
              </div>

              {/* Modality selection */}
              <div>
                <p className="tech-label mb-3">MODALIDAD</p>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => handleConfirmModality("v1v1")}
                    disabled={isCreatingMatch}
                    className="flex-1 py-3 border text-center transition-all disabled:opacity-40 hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]"
                    style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }}
                  >
                    <span className="terminal text-sm font-bold block">1v1</span>
                    <span className="tech-label" style={{ fontSize: "0.55rem" }}>LIGA</span>
                  </button>
                  <button
                    onClick={() => handleConfirmModality("ffa")}
                    disabled={isCreatingMatch}
                    className="flex-1 py-3 border text-center transition-all disabled:opacity-40"
                    style={{
                      borderColor: "var(--accent-cyan)",
                      background: "rgba(0,240,255,0.08)",
                      color: "var(--accent-cyan)",
                    }}
                  >
                    <span className="terminal text-sm font-bold block">FFA</span>
                    <span className="tech-label" style={{ fontSize: "0.55rem" }}>TODOS</span>
                  </button>
                  <button
                    onClick={() => handleConfirmModality("v2v2")}
                    disabled={isCreatingMatch}
                    className="flex-1 py-3 border text-center transition-all disabled:opacity-40 hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]"
                    style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }}
                  >
                    <span className="terminal text-sm font-bold block">2v2</span>
                    <span className="tech-label" style={{ fontSize: "0.55rem" }}>LIGA</span>
                  </button>
                </div>

                {isCreatingMatch && (
                  <motion.p
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="text-center tech-label mt-3"
                    style={{ color: "var(--accent-cyan)" }}
                  >
                    INICIANDO SESIÓN...
                  </motion.p>
                )}
              </div>

              <button
                onClick={handleReset}
                className="tech-label hover:text-white transition-colors text-center"
              >
                ↺ GIRAR DE NUEVO
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
            <p className="tech-label mb-3">
              VETAR JUEGO (1 POR JUGADOR)
              {playerVeto && (
                <span className="ml-2" style={{ color: "var(--accent-red)" }}>• 1 VETO USADO</span>
              )}
            </p>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {availableGames.map((game) => (
                <button
                  key={game.id}
                  onClick={() => handleVeto(game.id)}
                  disabled={!!playerVeto && playerVeto !== game.id}
                  className="text-xs p-2 border transition-all text-left truncate disabled:opacity-20"
                  style={{
                    borderColor: playerVeto === game.id ? "var(--accent-red)" : "rgba(255,255,255,0.08)",
                    background: playerVeto === game.id ? "rgba(255,42,42,0.08)" : "transparent",
                    color: playerVeto === game.id ? "var(--accent-red)" : "rgba(255,255,255,0.5)",
                  }}
                >
                  {playerVeto === game.id && "✗ "}
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
