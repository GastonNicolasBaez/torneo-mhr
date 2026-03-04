"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useCurrentPlayer } from "@/contexts/PlayerContext";

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
    fetch("/api/players").then((r) => r.json()).then((data) => {
      setPlayers(data.players || []);
      setSelectedPlayers(data.players?.map((p: Player) => p.id) || []);
    });
    fetch("/api/tournaments").then((r) => r.json()).then((data) =>
      setPastTournaments((data.tournaments || []).filter((t: Tournament) => t.status === "finished"))
    );
  }, []);

  const togglePlayer = (id: string) => {
    setSelectedPlayers((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleCreate = async () => {
    if (selectedPlayers.length < 2) { setError("MÍNIMO 2 JUGADORES"); return; }
    if (!tournamentName.trim()) { setError("NOMBRE REQUERIDO"); return; }
    setIsCreating(true); setError("");
    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tournamentName, playerIds: selectedPlayers }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "ERROR"); return; }
      await fetch(`/api/tournaments/${data.tournament.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      router.push(`/tournament/${data.tournament.id}`);
    } catch { setError("ERROR DE CONEXIÓN"); }
    finally { setIsCreating(false); }
  };

  const handleLogout = async () => {
    await fetch("/api/session", { method: "DELETE" });
    setCurrentPlayer(null);
    router.push("/select-player");
  };

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between mb-10 pt-4"
        >
          <div>
            <p className="tech-label mb-1" style={{ color: "var(--accent-cyan)" }}>▸ CONFIGURACIÓN</p>
            <h1 className="text-4xl font-bold tracking-widest" style={{ fontFamily: "var(--font-heading)" }}>
              LOBBY
            </h1>
          </div>
          {currentPlayer && (
            <div className="flex items-center gap-3 mt-1">
              <span className="tech-label">{currentPlayer.avatarEmoji} <span style={{ color: currentPlayer.colorHex }}>{currentPlayer.name}</span></span>
              <button onClick={handleLogout} className="tech-label hover:text-white transition-colors">
                [SALIR]
              </button>
            </div>
          )}
        </motion.div>

        {/* Tournament name */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mb-8">
          <p className="tech-label mb-2">NOMBRE DEL TORNEO</p>
          <input
            type="text"
            value={tournamentName}
            onChange={(e) => setTournamentName(e.target.value)}
            className="w-full bg-black border border-white/15 px-4 py-3 terminal text-white text-lg focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
            placeholder="Torneo MHR..."
          />
        </motion.div>

        {/* Player selection */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mb-8">
          <p className="tech-label mb-4">
            JUGADORES &nbsp;<span className="terminal" style={{ color: "var(--accent-cyan)" }}>{selectedPlayers.length}</span>/{players.length}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {players.map((player) => {
              const isSelected = selectedPlayers.includes(player.id);
              return (
                <button
                  key={player.id}
                  onClick={() => togglePlayer(player.id)}
                  className="flex items-center gap-2 p-3 border text-left transition-all"
                  style={{
                    borderColor: isSelected ? "var(--accent-cyan)" : "rgba(255,255,255,0.08)",
                    background: isSelected ? "rgba(0,240,255,0.05)" : "transparent",
                    opacity: isSelected ? 1 : 0.4,
                  }}
                >
                  <span className="text-xl">{player.avatarEmoji}</span>
                  <span className="terminal text-xs font-bold truncate" style={{ color: isSelected ? "var(--accent-cyan)" : player.colorHex }}>
                    {player.name.toUpperCase()}
                  </span>
                  {isSelected && <span className="ml-auto terminal text-xs" style={{ color: "var(--accent-cyan)" }}>✓</span>}
                </button>
              );
            })}
          </div>
        </motion.div>

        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="terminal text-xs mb-4" style={{ color: "var(--accent-red)" }}>
            ✗ {error}
          </motion.p>
        )}

        {/* Create button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          onClick={handleCreate}
          disabled={isCreating}
          className="w-full py-4 font-bold text-base tracking-widest uppercase transition-all disabled:opacity-40"
          style={{
            background: isCreating ? "transparent" : "var(--accent-cyan)",
            color: isCreating ? "var(--accent-cyan)" : "#000",
            border: "1px solid var(--accent-cyan)",
          }}
        >
          {isCreating ? "INICIANDO SECUENCIA..." : "▸ INICIAR TORNEO"}
        </motion.button>

        {/* Past tournaments */}
        {pastTournaments.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-12">
            <p className="tech-label mb-4">HISTORIAL</p>
            <div className="flex flex-col gap-1">
              {pastTournaments.map((t) => (
                <button
                  key={t.id}
                  onClick={() => router.push(`/tournament/${t.id}`)}
                  className="w-full flex items-center justify-between px-4 py-3 border border-white/8 hover:border-white/20 transition-colors text-left"
                >
                  <span className="text-sm text-white/60">{t.name}</span>
                  <span className="terminal text-xs text-white/25">
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
