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

      if (!res.ok) {
        setError(data.error || "Error al iniciar sesión");
        return;
      }

      setCurrentPlayer(data.player);
      router.push("/");
    } catch {
      setError("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h1
          className="text-5xl font-bold tracking-wider mb-3"
          style={{
            fontFamily: "var(--font-heading)",
            color: "#FF6B00",
            textShadow: "0 0 20px rgba(255, 107, 0, 0.5)",
          }}
        >
          TORNEO MHR
        </h1>
        <p className="text-zinc-400 text-lg tracking-widest uppercase">
          Liga de Videojuegos entre Amigos
        </p>
      </motion.div>

      {/* Player Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-2xl"
      >
        <p className="text-zinc-400 text-center mb-6 text-sm tracking-widest uppercase">
          ¿Quién sos?
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {players.map((player, index) => (
            <motion.button
              key={player.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelectPlayer(player)}
              className={`
                relative rounded-xl p-5 border-2 transition-all duration-300 flex flex-col items-center gap-3
                ${
                  selectedPlayer?.id === player.id
                    ? "border-orange-500 bg-orange-500/10"
                    : "border-zinc-800 bg-zinc-900/80 hover:border-zinc-600"
                }
              `}
            >
              {selectedPlayer?.id === player.id && (
                <motion.div
                  layoutId="selected-ring"
                  className="absolute inset-0 rounded-xl border-2 border-orange-500"
                  style={{
                    boxShadow: "0 0 20px rgba(255, 107, 0, 0.3)",
                  }}
                />
              )}
              <span className="text-4xl">{player.avatarEmoji}</span>
              <span
                className="font-semibold text-sm tracking-wide"
                style={{ color: player.colorHex }}
              >
                {player.name}
              </span>
              {player.pin && (
                <span className="text-xs text-zinc-500">🔒 PIN</span>
              )}
            </motion.button>
          ))}
        </div>

        {/* PIN + Confirm */}
        <AnimatePresence>
          {selectedPlayer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 flex flex-col items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedPlayer.avatarEmoji}</span>
                  <span
                    className="text-xl font-bold"
                    style={{ color: selectedPlayer.colorHex }}
                  >
                    {selectedPlayer.name}
                  </span>
                </div>

                {selectedPlayer.pin && (
                  <div className="w-full max-w-xs">
                    <label className="block text-xs text-zinc-400 mb-2 tracking-widest uppercase">
                      PIN (4 dígitos)
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={pin}
                      onChange={(e) =>
                        setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      placeholder="••••"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-center text-xl tracking-[0.5em] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
                      onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                    />
                  </div>
                )}

                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-red-400 text-sm"
                  >
                    {error}
                  </motion.p>
                )}

                <button
                  onClick={handleConfirm}
                  disabled={isLoading || (!!selectedPlayer.pin && pin.length < 4)}
                  className="w-full max-w-xs py-3 rounded-lg font-bold text-lg tracking-wider disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  style={{
                    background: isLoading ? "rgba(255,107,0,0.5)" : "#FF6B00",
                    color: "#09090b",
                    boxShadow: "0 0 20px rgba(255, 107, 0, 0.3)",
                  }}
                >
                  {isLoading ? "Entrando..." : "Entrar al Torneo"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
