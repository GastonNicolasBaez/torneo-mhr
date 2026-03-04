"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useCurrentPlayer } from "@/contexts/PlayerContext";
import { Edit, Check, X } from "lucide-react";

interface Player {
  id: string;
  name: string;
  avatarEmoji: string;
  colorHex: string;
  pin?: string | null;
  isActive: boolean;
}

interface Game {
  id: string;
  name: string;
  bannerUrl: string;
  isAvailable1v1: boolean;
  isAvailableFFA: boolean;
  isAvailable2v2: boolean;
  isBO3Preferred: boolean;
  isLongGame: boolean;
  orderIndex: number;
}

export default function AdminPage() {
  const router = useRouter();
  const { currentPlayer } = useCurrentPlayer();
  const [tab, setTab] = useState<"players" | "games">("players");
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [editingGame, setEditingGame] = useState<string | null>(null);
  const [playerEdits, setPlayerEdits] = useState<Partial<Player>>({});
  const [gameEdits, setGameEdits] = useState<Partial<Game>>({});

  useEffect(() => {
    fetch("/api/players").then((r) => r.json()).then((d) => setPlayers(d.players || []));
    fetch("/api/games").then((r) => r.json()).then((d) => setGames(d.games || []));
  }, []);

  const savePlayer = async (id: string) => {
    const res = await fetch(`/api/players/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(playerEdits),
    });
    if (res.ok) {
      const data = await res.json();
      setPlayers((prev) => prev.map((p) => (p.id === id ? data.player : p)));
      setEditingPlayer(null);
    }
  };

  const saveGame = async (id: string) => {
    const res = await fetch(`/api/games/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(gameEdits),
    });
    if (res.ok) {
      const data = await res.json();
      setGames((prev) => prev.map((g) => (g.id === id ? data.game : g)));
      setEditingGame(null);
    }
  };

  const FLAG_LABELS: Record<string, string> = {
    isAvailable1v1: "1V1",
    isAvailableFFA: "FFA",
    isAvailable2v2: "2V2",
    isBO3Preferred: "BO3",
    isLongGame: "LARGO",
  };

  return (
    <div className="min-h-screen bg-black pb-8">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="tech-label hover:text-white transition-colors"
          >
            ← VOLVER
          </button>
          <span className="text-white/20 text-xs">|</span>
          <span className="tech-label" style={{ color: "var(--accent-cyan)" }}>▸ ADMIN</span>
        </div>
        {currentPlayer && (
          <span className="tech-label">
            {currentPlayer.avatarEmoji} <span style={{ color: currentPlayer.colorHex }}>{currentPlayer.name.toUpperCase()}</span>
          </span>
        )}
      </header>

      {/* Tabs */}
      <div className="flex gap-px p-6 max-w-2xl mx-auto">
        {(["players", "games"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2.5 font-bold text-xs tracking-widest uppercase transition-all"
            style={{
              background: tab === t ? "var(--accent-cyan)" : "transparent",
              color: tab === t ? "#000" : "rgba(255,255,255,0.3)",
              border: `1px solid ${tab === t ? "var(--accent-cyan)" : "rgba(255,255,255,0.1)"}`,
            }}
          >
            {t === "players" ? "JUGADORES" : "JUEGOS"}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto px-6">

        {/* Players Tab */}
        {tab === "players" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2">
            {players.map((player) => (
              <div
                key={player.id}
                className="border border-white/8 p-4"
              >
                {editingPlayer === player.id ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={playerEdits.name ?? player.name}
                        onChange={(e) => setPlayerEdits((p) => ({ ...p, name: e.target.value }))}
                        className="flex-1 bg-black border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--accent-cyan)] terminal transition-colors"
                        placeholder="Nombre"
                      />
                      <input
                        type="text"
                        value={playerEdits.avatarEmoji ?? player.avatarEmoji}
                        onChange={(e) => setPlayerEdits((p) => ({ ...p, avatarEmoji: e.target.value }))}
                        className="w-14 bg-black border border-white/15 px-2 py-2 text-sm text-center focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
                        placeholder="Emoji"
                      />
                    </div>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={playerEdits.colorHex ?? player.colorHex}
                        onChange={(e) => setPlayerEdits((p) => ({ ...p, colorHex: e.target.value }))}
                        className="flex-1 bg-black border border-white/15 px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent-cyan)] terminal transition-colors"
                        placeholder="#00f0ff"
                        style={{ color: playerEdits.colorHex ?? player.colorHex }}
                      />
                      <input
                        type="password"
                        value={playerEdits.pin ?? ""}
                        onChange={(e) => setPlayerEdits((p) => ({ ...p, pin: e.target.value || null }))}
                        className="w-28 bg-black border border-white/15 px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent-cyan)] terminal transition-colors text-white"
                        placeholder="PIN (4)"
                        maxLength={4}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => { setEditingPlayer(null); setPlayerEdits({}); }}
                        className="p-2 border border-white/10 text-white/30 hover:text-white hover:border-white/30 transition-colors"
                      >
                        <X size={14} />
                      </button>
                      <button
                        onClick={() => savePlayer(player.id)}
                        className="p-2 border transition-colors"
                        style={{ borderColor: "var(--accent-cyan)", color: "var(--accent-cyan)" }}
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{player.avatarEmoji}</span>
                    <div className="flex-1">
                      <p className="terminal text-sm font-bold" style={{ color: player.colorHex }}>
                        {player.name.toUpperCase()}
                      </p>
                      <p className="tech-label mt-0.5">
                        {player.colorHex} · {player.pin ? "🔒 PIN" : "SIN PIN"}
                        {!player.isActive ? " · INACTIVO" : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => { setEditingPlayer(player.id); setPlayerEdits({}); }}
                      className="p-2 text-white/20 hover:text-white transition-colors"
                    >
                      <Edit size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {/* Games Tab */}
        {tab === "games" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-1">
            {games.map((game) => (
              <div
                key={game.id}
                className="border border-white/8 px-4 py-3"
              >
                {editingGame === game.id ? (
                  <div className="flex flex-col gap-3">
                    <p className="terminal text-sm font-bold" style={{ color: "var(--accent-cyan)" }}>
                      {game.name.toUpperCase()}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {(["isAvailable1v1", "isAvailableFFA", "isAvailable2v2", "isBO3Preferred", "isLongGame"] as const).map((flag) => {
                        const active = gameEdits[flag] !== undefined ? gameEdits[flag] : game[flag];
                        return (
                          <button
                            key={flag}
                            onClick={() => setGameEdits((g) => ({ ...g, [flag]: !active }))}
                            className="py-1.5 text-xs font-bold tracking-wider border transition-all"
                            style={{
                              borderColor: active ? "var(--accent-cyan)" : "rgba(255,255,255,0.08)",
                              background: active ? "rgba(0,240,255,0.08)" : "transparent",
                              color: active ? "var(--accent-cyan)" : "rgba(255,255,255,0.25)",
                            }}
                          >
                            {FLAG_LABELS[flag]}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => { setEditingGame(null); setGameEdits({}); }}
                        className="p-2 border border-white/10 text-white/30 hover:text-white hover:border-white/30 transition-colors"
                      >
                        <X size={14} />
                      </button>
                      <button
                        onClick={() => saveGame(game.id)}
                        className="p-2 border transition-colors"
                        style={{ borderColor: "var(--accent-cyan)", color: "var(--accent-cyan)" }}
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 truncate">{game.name}</p>
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        {game.isAvailable1v1 && <span className="tech-label border border-white/10 px-1.5 py-0.5">1V1</span>}
                        {game.isAvailableFFA && <span className="tech-label border border-white/10 px-1.5 py-0.5">FFA</span>}
                        {game.isAvailable2v2 && <span className="tech-label border border-white/10 px-1.5 py-0.5">2V2</span>}
                        {game.isBO3Preferred && <span className="tech-label border px-1.5 py-0.5" style={{ borderColor: "rgba(0,240,255,0.3)", color: "var(--accent-cyan)" }}>BO3</span>}
                        {game.isLongGame && <span className="tech-label px-1.5 py-0.5 text-amber-500">LARGO</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => { setEditingGame(game.id); setGameEdits({}); }}
                      className="p-2 text-white/20 hover:text-white transition-colors"
                    >
                      <Edit size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
