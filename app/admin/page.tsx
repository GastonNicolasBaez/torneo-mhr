"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useCurrentPlayer } from "@/contexts/PlayerContext";
import { ChevronLeft, Edit, Check, X, Plus, Settings } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-zinc-950 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-zinc-800 bg-zinc-900/50">
        <button
          onClick={() => router.back()}
          className="text-zinc-400 hover:text-zinc-100"
        >
          <ChevronLeft size={24} />
        </button>
        <h1
          style={{ fontFamily: "var(--font-heading)", color: "#FF6B00" }}
          className="text-xl font-bold tracking-wider"
        >
          ADMIN
        </h1>
        <span className="text-zinc-500 text-sm ml-auto flex items-center gap-1">
          <Settings size={14} /> {currentPlayer?.name}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-4 max-w-2xl mx-auto">
        {(["players", "games"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-bold tracking-widest uppercase transition-all ${
              tab === t
                ? "bg-orange-500 text-zinc-950"
                : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
            }`}
          >
            {t === "players" ? "👤 Jugadores" : "🎮 Juegos"}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {/* Players Tab */}
        {tab === "players" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {players.map((player) => (
              <div
                key={player.id}
                className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4"
              >
                {editingPlayer === player.id ? (
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={playerEdits.name ?? player.name}
                        onChange={(e) => setPlayerEdits((p) => ({ ...p, name: e.target.value }))}
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500"
                        placeholder="Nombre"
                      />
                      <input
                        type="text"
                        value={playerEdits.avatarEmoji ?? player.avatarEmoji}
                        onChange={(e) => setPlayerEdits((p) => ({ ...p, avatarEmoji: e.target.value }))}
                        className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:border-orange-500"
                        placeholder="Emoji"
                      />
                    </div>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={playerEdits.colorHex ?? player.colorHex}
                        onChange={(e) => setPlayerEdits((p) => ({ ...p, colorHex: e.target.value }))}
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-500"
                        placeholder="#FF6B00"
                      />
                      <input
                        type="password"
                        value={playerEdits.pin ?? ""}
                        onChange={(e) => setPlayerEdits((p) => ({ ...p, pin: e.target.value || null }))}
                        className="w-28 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-500"
                        placeholder="PIN (4 digs)"
                        maxLength={4}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => { setEditingPlayer(null); setPlayerEdits({}); }}
                        className="p-2 text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded-lg"
                      >
                        <X size={16} />
                      </button>
                      <button
                        onClick={() => savePlayer(player.id)}
                        className="p-2 text-green-400 border border-green-500 rounded-lg hover:bg-green-500/10"
                      >
                        <Check size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{player.avatarEmoji}</span>
                    <div className="flex-1">
                      <p className="font-semibold" style={{ color: player.colorHex }}>
                        {player.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {player.colorHex} • {player.pin ? "🔒 PIN configurado" : "Sin PIN"}
                        {!player.isActive && " • Inactivo"}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingPlayer(player.id);
                        setPlayerEdits({});
                      }}
                      className="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {/* Games Tab */}
        {tab === "games" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            {games.map((game) => (
              <div
                key={game.id}
                className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4"
              >
                {editingGame === game.id ? (
                  <div className="space-y-3">
                    <p className="font-semibold text-orange-400">{game.name}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(["isAvailable1v1", "isAvailableFFA", "isAvailable2v2", "isBO3Preferred", "isLongGame"] as const).map((flag) => (
                        <label key={flag} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={gameEdits[flag] !== undefined ? gameEdits[flag] : game[flag]}
                            onChange={(e) => setGameEdits((g) => ({ ...g, [flag]: e.target.checked }))}
                            className="w-4 h-4 rounded accent-orange-500"
                          />
                          <span className="text-xs text-zinc-400">
                            {flag.replace("isAvailable", "").replace("is", "").toLowerCase()}
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => { setEditingGame(null); setGameEdits({}); }}
                        className="p-2 text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded-lg"
                      >
                        <X size={16} />
                      </button>
                      <button
                        onClick={() => saveGame(game.id)}
                        className="p-2 text-green-400 border border-green-500 rounded-lg hover:bg-green-500/10"
                      >
                        <Check size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-zinc-200">{game.name}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {game.isAvailable1v1 && <span className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">1v1</span>}
                        {game.isAvailableFFA && <span className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">FFA</span>}
                        {game.isAvailable2v2 && <span className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">2v2</span>}
                        {game.isBO3Preferred && <span className="text-xs bg-zinc-800 text-orange-500 px-1.5 py-0.5 rounded">BO3</span>}
                        {game.isLongGame && <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">Largo</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setEditingGame(game.id);
                        setGameEdits({});
                      }}
                      className="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      <Edit size={16} />
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
