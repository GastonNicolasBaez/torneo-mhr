"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useCurrentPlayer } from "@/contexts/PlayerContext";
import { Trophy, Users, Plus, Zap, LogOut } from "lucide-react";

interface Player {
  id: string;
  name: string;
  avatarEmoji: string;
  colorHex: string;
}

interface Tournament {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

export default function LobbyPage() {
  const router = useRouter();
  const { currentPlayer, setCurrentPlayer } = useCurrentPlayer();
  const [players, setPlayers] = useState<Player[]>([]);
  const [pastTournaments, setPastTournaments] = useState<Tournament[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [tournamentName, setTournamentName] = useState("Torneo MHR");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/players")
      .then((r) => r.json())
      .then((data) => {
        setPlayers(data.players || []);
        // Auto-select all players
        setSelectedPlayers(data.players?.map((p: Player) => p.id) || []);
      });

    fetch("/api/tournaments")
      .then((r) => r.json())
      .then((data) =>
        setPastTournaments(
          (data.tournaments || []).filter((t: Tournament) => t.status === "finished")
        )
      );
  }, []);

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleCreateTournament = async () => {
    if (selectedPlayers.length < 2) {
      setError("Seleccioná al menos 2 jugadores");
      return;
    }
    if (!tournamentName.trim()) {
      setError("El torneo necesita un nombre");
      return;
    }

    setIsCreating(true);
    setError("");

    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tournamentName,
          playerIds: selectedPlayers,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al crear torneo");
        return;
      }

      // Start the tournament
      await fetch(`/api/tournaments/${data.tournament.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });

      router.push(`/tournament/${data.tournament.id}`);
    } catch {
      setError("Error de conexión");
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/session", { method: "DELETE" });
    setCurrentPlayer(null);
    router.push("/select-player");
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-10"
        >
          <div>
            <h1
              className="text-4xl font-bold tracking-wider"
              style={{
                fontFamily: "var(--font-heading)",
                color: "#FF6B00",
                textShadow: "0 0 15px rgba(255, 107, 0, 0.4)",
              }}
            >
              LOBBY
            </h1>
            <p className="text-zinc-400 text-sm mt-1">Configurá el nuevo torneo</p>
          </div>
          {currentPlayer && (
            <div className="flex items-center gap-3">
              <span className="text-zinc-300 text-sm">
                <span className="text-lg mr-1">{currentPlayer.avatarEmoji}</span>
                {currentPlayer.name}
              </span>
              <button
                onClick={handleLogout}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-2"
                title="Cambiar jugador"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </motion.div>

        {/* Tournament Name */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <label className="block text-xs text-zinc-400 mb-2 tracking-widest uppercase flex items-center gap-2">
            <Trophy size={14} />
            Nombre del Torneo
          </label>
          <input
            type="text"
            value={tournamentName}
            onChange={(e) => setTournamentName(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 text-lg font-semibold focus:outline-none focus:border-orange-500 transition-colors"
            placeholder="Torneo MHR..."
          />
        </motion.div>

        {/* Player Selection */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <label className="block text-xs text-zinc-400 mb-4 tracking-widest uppercase flex items-center gap-2">
            <Users size={14} />
            Jugadores ({selectedPlayers.length} seleccionados)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {players.map((player) => {
              const isSelected = selectedPlayers.includes(player.id);
              return (
                <motion.button
                  key={player.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => togglePlayer(player.id)}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 text-left
                    ${
                      isSelected
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600 opacity-60"
                    }
                  `}
                >
                  <span className="text-2xl">{player.avatarEmoji}</span>
                  <span
                    className="font-semibold text-sm truncate"
                    style={{ color: isSelected ? player.colorHex : "#6b7280" }}
                  >
                    {player.name}
                  </span>
                  {isSelected && (
                    <span className="ml-auto text-orange-500 text-xs">✓</span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Error */}
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-400 text-sm mb-4 text-center"
          >
            {error}
          </motion.p>
        )}

        {/* Create Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCreateTournament}
          disabled={isCreating}
          className="w-full py-4 rounded-xl font-bold text-xl tracking-widest uppercase flex items-center justify-center gap-3 disabled:opacity-50 transition-all"
          style={{
            background: isCreating
              ? "rgba(255,107,0,0.5)"
              : "linear-gradient(135deg, #FF6B00, #FF8C40)",
            color: "#09090b",
            boxShadow: "0 0 30px rgba(255, 107, 0, 0.3)",
          }}
        >
          {isCreating ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <Zap size={20} />
              </motion.div>
              Iniciando...
            </>
          ) : (
            <>
              <Plus size={20} />
              Iniciar Torneo
            </>
          )}
        </motion.button>

        {/* Past Tournaments */}
        {pastTournaments.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-10"
          >
            <h2 className="text-xs text-zinc-500 tracking-widest uppercase mb-4">
              Torneos Anteriores
            </h2>
            <div className="space-y-2">
              {pastTournaments.map((t) => (
                <button
                  key={t.id}
                  onClick={() => router.push(`/tournament/${t.id}`)}
                  className="w-full flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-zinc-600 transition-colors text-left"
                >
                  <span className="text-zinc-300 font-medium">{t.name}</span>
                  <span className="text-zinc-500 text-xs">
                    {new Date(t.createdAt).toLocaleDateString("es-AR")}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
