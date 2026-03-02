"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentPlayer } from "@/contexts/PlayerContext";
import { ChevronLeft, Shield, AlertTriangle, CheckCircle, XCircle, Clock, Star } from "lucide-react";

interface Player {
  id: string;
  name: string;
  avatarEmoji: string;
  colorHex: string;
}

interface Match {
  id: string;
  gameId: string;
  type: string;
  status: string;
  roundNumber: number;
  isMemeMatch: boolean;
  tournamentId: string;
  winnerId?: string;
  gameSessionId?: string | null;
}

interface MatchResult {
  id: string;
  playerId: string;
  placement: number;
  tournamentPoints: number;
  gameScore?: number;
  isConfirmed: boolean;
}

interface AuditLog {
  id: string;
  action: string;
  playerId: string;
  resolvedBy?: string;
  details: string;
  createdAt: string;
}

interface Game {
  id: string;
  name: string;
  bannerUrl: string;
}

const PLACEMENT_LABELS = ["🥇 1°", "🥈 2°", "🥉 3°", "4°", "5°"];
const STATUS_COLORS: Record<string, string> = {
  pending: "#6b7280",
  playing: "#FF6B00",
  rating: "#a78bfa",
  pending_validation: "#f59e0b",
  disputed: "#ef4444",
  finished: "#00FF87",
  cancelled: "#6b7280",
};
const ACTION_ICONS: Record<string, string> = {
  RESULT_SUBMITTED: "📤",
  RESULT_CONFIRMED: "✅",
  DISPUTE_RAISED: "⚠️",
  ADMIN_RESOLVED: "🛡️",
  MATCH_CANCELLED: "❌",
};

export default function MatchHubPage() {
  const params = useParams();
  const router = useRouter();
  const { currentPlayer } = useCurrentPlayer();
  const tournamentId = params.id as string;
  const matchId = params.matchId as string;

  const [match, setMatch] = useState<Match | null>(null);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [tournamentPlayers, setTournamentPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState(false);

  // Result submission state
  const [placements, setPlacements] = useState<Record<string, number>>({});
  const [gameScores, setGameScores] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const auditRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    const [mRes, tRes] = await Promise.all([
      fetch(`/api/matches/${matchId}`),
      fetch(`/api/tournaments/${tournamentId}`),
    ]);

    if (mRes.ok) {
      const mData = await mRes.json();
      setMatch(mData.match);
      setResults(mData.results || []);
      setAuditLogs(mData.auditLogs || []);

      if (mData.match?.gameId) {
        fetch(`/api/games`).then((r) => r.json()).then((gData) => {
          const g = gData.games?.find((g: Game) => g.id === mData.match.gameId);
          if (g) setGame(g);
        });
      }
    }

    if (tRes.ok) {
      const tData = await tRes.json();
      setTournamentPlayers(tData.players || []);
      setIsHost(tData.tournament?.hostId === currentPlayer?.id);
    }
  }, [matchId, tournamentId, currentPlayer?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Poll for updates
  useEffect(() => {
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Auto-scroll audit log
  useEffect(() => {
    if (auditRef.current) {
      auditRef.current.scrollTop = auditRef.current.scrollHeight;
    }
  }, [auditLogs]);

  const playerMap = Object.fromEntries(tournamentPlayers.map((p) => [p.id, p]));

  // Calculate tournament points based on placement and match type
  const calcPoints = (placement: number, type: string): number => {
    if (type === "v1v1") {
      if (placement === 1) return 4;
      return 0;
    }
    const map: Record<number, number> = { 1: 4, 2: 3, 3: 2, 4: 1, 5: 0 };
    return map[placement] ?? 0;
  };

  const handleSubmitResults = async () => {
    if (!match) return;
    const playerIds = Object.keys(placements);
    if (playerIds.length < 2) {
      alert("Asigná posiciones a todos los jugadores");
      return;
    }

    setIsSubmitting(true);
    const resultsPayload = playerIds.map((pid) => ({
      playerId: pid,
      placement: placements[pid],
      tournamentPoints: calcPoints(placements[pid], match.type),
      gameScore: gameScores[pid] ? parseInt(gameScores[pid]) : undefined,
    }));

    await fetch(`/api/matches/${matchId}/results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results: resultsPayload }),
    });

    await loadData();
    setIsSubmitting(false);
  };

  const handleConfirm = async (confirmed: boolean) => {
    setIsConfirming(true);
    await fetch(`/api/matches/${matchId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmed }),
    });
    await loadData();
    setIsConfirming(false);
  };

  const handleHostAction = async (action: "resolve" | "cancel") => {
    await fetch(`/api/matches/${matchId}/dispute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: action === "resolve" ? "Resuelto por el host" : "Cancelado por el host" }),
    });
    await loadData();
  };

  const handleAdvanceToRating = async () => {
    await fetch(`/api/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rating" }),
    });
    router.push(`/tournament/${tournamentId}/match/${matchId}/rating`);
  };

  const currentPlayerResult = results.find((r) => r.playerId === currentPlayer?.id);
  const alreadyConfirmed = currentPlayerResult?.isConfirmed;

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-zinc-800 bg-zinc-900/50">
        <button
          onClick={() => router.push(`/tournament/${tournamentId}`)}
          className="text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 style={{ fontFamily: "var(--font-heading)", color: "#FF6B00" }} className="text-xl font-bold tracking-wider">
            {game?.name || "PARTIDA"}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: STATUS_COLORS[match?.status || "pending"] }}
            />
            <span className="text-xs text-zinc-400 uppercase tracking-wider">
              {match?.status?.replace("_", " ")} • {match?.type?.toUpperCase()} • Ronda {match?.roundNumber}
              {match?.isMemeMatch && " • 🎭 MEME"}
            </span>
          </div>
        </div>
        {match?.status === "playing" && (
          <button
            onClick={handleAdvanceToRating}
            className="text-xs px-3 py-1.5 rounded-lg border border-purple-500 text-purple-400 hover:bg-purple-500/10 transition-colors"
          >
            ⭐ Calificar
          </button>
        )}
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Game Banner */}
        {game && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative rounded-xl overflow-hidden"
            style={{ height: 120 }}
          >
            <img
              src={game.bannerUrl}
              alt={game.name}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/600x120/1a1a2e/FF6B00?text=${encodeURIComponent(game.name)}`; }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 to-transparent" />
          </motion.div>
        )}

        {/* === PLAYING: Result Submission === */}
        {match?.status === "playing" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Shield size={16} className="text-orange-500" />
              <h2 className="text-sm font-bold tracking-widest uppercase text-zinc-300">
                Cargar Resultados
              </h2>
            </div>
            <div className="space-y-3">
              {tournamentPlayers.map((player) => (
                <div key={player.id} className="flex items-center gap-3">
                  <span className="text-xl w-8">{player.avatarEmoji}</span>
                  <span className="flex-1 font-medium text-sm" style={{ color: player.colorHex }}>
                    {player.name}
                  </span>
                  <select
                    value={placements[player.id] || ""}
                    onChange={(e) =>
                      setPlacements((prev) => ({ ...prev, [player.id]: parseInt(e.target.value) }))
                    }
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-orange-500"
                  >
                    <option value="">Posición</option>
                    {[1, 2, 3, 4, 5].slice(0, match.type === "v1v1" ? 2 : tournamentPlayers.length).map((n) => (
                      <option key={n} value={n}>
                        {PLACEMENT_LABELS[n - 1]}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={gameScores[player.id] || ""}
                    onChange={(e) =>
                      setGameScores((prev) => ({ ...prev, [player.id]: e.target.value }))
                    }
                    placeholder="Score"
                    className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={handleSubmitResults}
              disabled={isSubmitting || Object.keys(placements).length < tournamentPlayers.length}
              className="w-full mt-4 py-3 rounded-xl font-bold text-sm tracking-widest uppercase disabled:opacity-50 transition-all"
              style={{
                background: "linear-gradient(135deg, #FF6B00, #FF8C40)",
                color: "#09090b",
                boxShadow: "0 0 20px rgba(255,107,0,0.3)",
              }}
            >
              {isSubmitting ? "Enviando..." : "📤 Enviar Resultados al VAR"}
            </button>
          </motion.div>
        )}

        {/* === PENDING_VALIDATION: Confirmation Panel === */}
        {match?.status === "pending_validation" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/80 border border-amber-500/30 rounded-xl p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} className="text-amber-500" />
              <h2 className="text-sm font-bold tracking-widest uppercase text-amber-400">
                Esperando Confirmación
              </h2>
            </div>
            <div className="space-y-3 mb-4">
              {results.map((result) => {
                const player = playerMap[result.playerId];
                if (!player) return null;
                return (
                  <div key={result.id} className="flex items-center gap-3">
                    <span className="text-xl">{player.avatarEmoji}</span>
                    <span className="flex-1 font-medium text-sm" style={{ color: player.colorHex }}>
                      {player.name}
                    </span>
                    <span className="text-zinc-400 text-sm">
                      {PLACEMENT_LABELS[result.placement - 1]}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)" }} className="text-orange-400 font-bold">
                      {result.tournamentPoints}pts
                    </span>
                    <span>
                      {result.isConfirmed ? (
                        <CheckCircle size={16} className="text-green-400" />
                      ) : (
                        <Clock size={16} className="text-zinc-500" />
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
            {currentPlayer && !alreadyConfirmed && results.some((r) => r.playerId !== currentPlayer.id) && (
              <div className="flex gap-3">
                <button
                  onClick={() => handleConfirm(true)}
                  disabled={isConfirming}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-green-500/20 border border-green-500 text-green-400 hover:bg-green-500/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle size={16} /> Confirmar
                </button>
                <button
                  onClick={() => handleConfirm(false)}
                  disabled={isConfirming}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <XCircle size={16} /> Disputar
                </button>
              </div>
            )}
            {alreadyConfirmed && (
              <p className="text-center text-green-400 text-sm">✓ Ya confirmaste estos resultados</p>
            )}
          </motion.div>
        )}

        {/* === DISPUTED: Host Resolution === */}
        {match?.status === "disputed" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/80 border border-red-500/30 rounded-xl p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={16} className="text-red-400" />
              <h2 className="text-sm font-bold tracking-widest uppercase text-red-400">
                Resultado Disputado
              </h2>
            </div>
            <p className="text-zinc-400 text-sm mb-4">
              Un jugador rechazó los resultados. El host debe resolver la disputa.
            </p>
            {isHost && (
              <div className="flex gap-3">
                <button
                  onClick={() => handleHostAction("resolve")}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-green-500/20 border border-green-500 text-green-400 hover:bg-green-500/30 transition-colors"
                >
                  🛡️ Aprobar Resultados
                </button>
                <button
                  onClick={() => handleHostAction("cancel")}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-500 transition-colors"
                >
                  ❌ Cancelar Partida
                </button>
              </div>
            )}
            {!isHost && (
              <p className="text-zinc-500 text-sm text-center">Esperando al host para resolver...</p>
            )}
          </motion.div>
        )}

        {/* === FINISHED: Final Results === */}
        {match?.status === "finished" && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/80 border border-green-500/30 rounded-xl p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle size={16} className="text-green-400" />
              <h2 className="text-sm font-bold tracking-widest uppercase text-green-400">
                Resultados Finales
              </h2>
            </div>
            <div className="space-y-3">
              {[...results]
                .sort((a, b) => a.placement - b.placement)
                .map((result) => {
                  const player = playerMap[result.playerId];
                  if (!player) return null;
                  return (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3"
                    >
                      <span className="text-xl w-8 text-center">{PLACEMENT_LABELS[result.placement - 1]}</span>
                      <span className="text-xl">{player.avatarEmoji}</span>
                      <span className="flex-1 font-medium" style={{ color: player.colorHex }}>
                        {player.name}
                      </span>
                      {result.gameScore !== null && result.gameScore !== undefined && (
                        <span className="text-zinc-400 text-sm">{result.gameScore} pts</span>
                      )}
                      <span style={{ fontFamily: "var(--font-mono)" }} className="text-xl font-bold text-orange-400">
                        +{result.tournamentPoints}
                      </span>
                    </motion.div>
                  );
                })}
            </div>
            <div className="flex flex-col gap-2 mt-4">
              {match.gameSessionId && (
                <button
                  onClick={() => router.push(`/tournament/${tournamentId}/league/${match.gameSessionId}`)}
                  className="w-full py-3 rounded-xl font-bold text-sm tracking-wider flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, #00FF87, #00CC6A)",
                    color: "#09090b",
                    boxShadow: "0 0 20px rgba(0,255,135,0.3)",
                  }}
                >
                  ← Volver a la liga
                </button>
              )}
              <button
                onClick={() => router.push(`/tournament/${tournamentId}/match/${matchId}/rating`)}
                className="w-full py-3 rounded-xl font-bold text-sm border border-purple-500 text-purple-400 hover:bg-purple-500/10 transition-colors flex items-center justify-center gap-2"
              >
                <Star size={16} /> Ver / Añadir Calificación
              </button>
            </div>
          </motion.div>
        )}

        {/* === AUDIT LOG === */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-orange-500">▶</span>
            <h2 className="text-sm font-bold tracking-widest uppercase text-zinc-300">
              VAR / Auditoría
            </h2>
          </div>
          <div
            ref={auditRef}
            className="bg-zinc-950 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1"
            style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}
          >
            {auditLogs.length === 0 ? (
              <p className="text-zinc-600">$ Sin eventos aún...</p>
            ) : (
              auditLogs.map((log) => {
                const player = playerMap[log.playerId];
                const time = new Date(log.createdAt).toLocaleTimeString("es-AR");
                return (
                  <div key={log.id} className="flex gap-2">
                    <span className="text-zinc-600 flex-shrink-0">[{time}]</span>
                    <span className="text-zinc-500">{ACTION_ICONS[log.action]}</span>
                    <span className="text-zinc-400">
                      <span style={{ color: player?.colorHex || "#fafafa" }}>
                        {player?.name || "?"}
                      </span>
                      {" → "}
                      <span className="text-zinc-300">{log.action.replace(/_/g, " ")}</span>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
