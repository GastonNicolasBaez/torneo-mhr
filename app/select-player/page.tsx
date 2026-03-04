"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentPlayer } from "@/contexts/PlayerContext";

interface Player {
  id: string;
  name: string;
  avatarEmoji: string;
  colorHex: string;
  pin?: string | null;
}

export default function SelectPlayerPage() {
  const router = useRouter();
  const { setCurrentPlayer } = useCurrentPlayer();
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetch("/api/players")
      .then((r) => r.json())
      .then((data) => setPlayers(data.players || []));
  }, []);

  const handleSelectPlayer = (player: Player) => {
    setSelectedPlayer(player);
    setPin("");
    setError("");
  };

  const handleConfirm = async () => {
    if (!selectedPlayer) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: selectedPlayer.id, pin }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error al iniciar sesión"); return; }
      setCurrentPlayer(data.player);
      router.push("/");
    } catch {
      setError("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      {/* Wordmark */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-14"
      >
        <p className="tech-label mb-3" style={{ color: "var(--accent-cyan)" }}>
          ▸ SISTEMA DE IDENTIFICACIÓN
        </p>
        <h1
          className="text-6xl font-bold tracking-widest"
          style={{ fontFamily: "var(--font-heading)", color: "#ffffff" }}
        >
          TORNEO MAHURA
        </h1>
        <div className="h-px w-32 mx-auto mt-4" style={{ background: "var(--accent-cyan)" }} />
        <p className="tech-label mt-3 tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.45)" }}>
          GAMER DEL AÑO
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-xl"
      >
        <p className="tech-label text-center mb-6">SELECCIONAR JUGADOR</p>

        {/* Player grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {players.map((player, i) => {
            const isSelected = selectedPlayer?.id === player.id;
            return (
              <motion.button
                key={player.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => handleSelectPlayer(player)}
                className="relative p-4 border text-left transition-all flex flex-col items-center gap-2"
                style={{
                  borderColor: isSelected ? "var(--accent-cyan)" : "rgba(255,255,255,0.1)",
                  background: isSelected ? "rgba(0,240,255,0.06)" : "rgba(10,10,10,0.6)",
                }}
              >
                {/* Cyan corner accent when selected */}
                {isSelected && (
                  <motion.div
                    layoutId="sel"
                    className="absolute top-0 left-0 w-3 h-3"
                    style={{ borderTop: "2px solid var(--accent-cyan)", borderLeft: "2px solid var(--accent-cyan)" }}
                  />
                )}
                <span className="text-3xl">{player.avatarEmoji}</span>
                <span className="terminal text-xs font-bold" style={{ color: isSelected ? "var(--accent-cyan)" : player.colorHex }}>
                  {player.name.toUpperCase()}
                </span>
                {player.pin && <span className="tech-label" style={{ fontSize: "0.55rem" }}>🔒 PIN</span>}
              </motion.button>
            );
          })}
        </div>

        {/* PIN + Confirm panel */}
        <AnimatePresence>
          {selectedPlayer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="hud-panel p-6 flex flex-col items-center gap-5">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedPlayer.avatarEmoji}</span>
                  <div>
                    <p className="tech-label" style={{ color: "var(--accent-cyan)" }}>IDENTIFICADO COMO</p>
                    <p className="terminal text-lg font-bold" style={{ color: selectedPlayer.colorHex }}>
                      {selectedPlayer.name.toUpperCase()}
                    </p>
                  </div>
                </div>

                {selectedPlayer.pin && (
                  <div className="w-full max-w-xs">
                    <p className="tech-label mb-2">CÓDIGO DE ACCESO</p>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="_ _ _ _"
                      className="w-full bg-black border border-white/20 px-4 py-3 text-center terminal text-2xl tracking-[0.6em] text-white placeholder:text-white/20 focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
                      onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                    />
                  </div>
                )}

                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="terminal text-xs" style={{ color: "var(--accent-red)" }}>
                    ✗ {error.toUpperCase()}
                  </motion.p>
                )}

                <button
                  onClick={handleConfirm}
                  disabled={isLoading || (!!selectedPlayer.pin && pin.length < 4)}
                  className="w-full max-w-xs py-3 border font-bold text-sm tracking-widest uppercase transition-all disabled:opacity-30"
                  style={{
                    borderColor: "var(--accent-cyan)",
                    color: isLoading ? "var(--accent-cyan)" : "#000",
                    background: isLoading ? "transparent" : "var(--accent-cyan)",
                  }}
                >
                  {isLoading ? "VERIFICANDO..." : "CONFIRMAR ACCESO →"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
