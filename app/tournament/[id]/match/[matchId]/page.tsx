"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentPlayer } from "@/contexts/PlayerContext";

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

const PLACEMENT_LABELS = ["1°", "2°", "3°", "4°", "5°"];

const STATUS_COLOR: Record<string, string> = {
  pending: "#52525b",
  playing: "#ffffff",
  rating: "#a78bfa",
  pending_validation: "#facc15",
  disputed: "var(--accent-red)",
  finished: "var(--accent-cyan)",
  cancelled: "#52525b",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "PENDING",
  playing: "LIVE",
  rating: "RATING",
  pending_validation: "VAR",
  disputed: "DISPUTE",
  finished: "DONE",
  cancelled: "VOID",
};

const ACTION_ICONS: Record<string, string> = {
  RESULT_SUBMITTED: "→",
  RESULT_CONFIRMED: "✓",
  DISPUTE_RAISED: "!",
  ADMIN_RESOLVED: "■",
  MATCH_CANCELLED: "✗",
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
  const [tournamentPlayers, setTournamentPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState(false);

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
        fetch("/api/games").then((r) => r.json()).then((gData) => {
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
  useEffect(() => {
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    if (auditRef.current) {
      auditRef.current.scrollTop = auditRef.current.scrollHeight;
    }
  }, [auditLogs]);

  const playerMap = Object.fromEntries(tournamentPlayers.map((p) => [p.id, p]));

  const handleSubmitResults = async () => {
    if (!match) return;
    const playerIds = Object.keys(placements);
    if (playerIds.length < 2) {
      alert("Asigná posiciones a todos los jugadores");
      return;
    }
    setIsSubmitting(true);
    const isFFA = match.type === "ffa";
    const resultsPayload = playerIds.map((pid) => ({
      playerId: pid,
      placement: placements[pid],
      // Points are always calculated server-side; gameScore only for non-FFA
      gameScore: !isFFA && gameScores[pid] ? parseInt(gameScores[pid]) : undefined,
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

  const statusColor = STATUS_COLOR[match?.status || "pending"];
  const statusLabel = STATUS_LABEL[match?.status || "pending"];

  return (
    <div className="min-h-screen bg-black">
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
          <div>
            <span className="tech-label" style={{ color: "var(--accent-cyan)" }}>
              ▸ {game?.name?.toUpperCase() || "PARTIDA"}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-1.5 h-1.5 inline-block" style={{ background: statusColor }} />
              <span className="terminal text-xs text-white/30">
                {statusLabel} · {match?.type?.toUpperCase()} · R{match?.roundNumber}
                {match?.isMemeMatch ? " · 🎭" : ""}
              </span>
            </div>
          </div>
        </div>
        {match?.status === "playing" && (
          <button
            onClick={handleAdvanceToRating}
            className="tech-label hover:text-white transition-colors"
            style={{ color: "#a78bfa", borderColor: "#a78bfa" }}
          >
            ⭐ CALIFICAR
          </button>
        )}
      </header>

      {/* Game banner */}
      {game && (
        <div className="relative w-full" style={{ height: 100, overflow: "hidden" }}>
          <img
            src={game.bannerUrl}
            alt={game.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://placehold.co/800x100/050505/00f0ff?text=${encodeURIComponent(game.name)}`;
            }}
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to right, #000 10%, transparent 60%, #000 100%)" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #000 0%, transparent 50%)" }} />
        </div>
      )}

      <div className="max-w-2xl mx-auto p-6 space-y-4">

        {/* PLAYING: Result Submission */}
        {match?.status === "playing" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="hud-panel p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="tech-label" style={{ color: "var(--accent-cyan)" }}>
                ▸ CARGAR RESULTADOS
              </p>
              {match.type === "ffa" && (
                <p className="terminal text-xs text-white/25">1°+4 · 2°+3 · 3°+2 · 4°+1 · 5°+0</p>
              )}
            </div>
            <div className="flex flex-col gap-3">
              {tournamentPlayers.map((player) => {
                const pos = placements[player.id];
                const FFA_PTS: Record<number, number> = { 1: 4, 2: 3, 3: 2, 4: 1, 5: 0 };
                const isFFA = match.type === "ffa";
                return (
                <div key={player.id} className="flex items-center gap-3">
                  <span className="text-lg w-7">{player.avatarEmoji}</span>
                  <span className="flex-1 terminal text-xs font-bold" style={{ color: player.colorHex }}>
                    {player.name.toUpperCase()}
                  </span>
                  <select
                    value={pos || ""}
                    onChange={(e) => setPlacements((prev) => ({ ...prev, [player.id]: parseInt(e.target.value) }))}
                    className="bg-black border border-white/15 px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[var(--accent-cyan)] transition-colors terminal"
                  >
                    <option value="">POS</option>
                    {[1, 2, 3, 4, 5].slice(0, match.type === "v1v1" ? 2 : tournamentPlayers.length).map((n) => (
                      <option key={n} value={n}>{PLACEMENT_LABELS[n - 1]}</option>
                    ))}
                  </select>
                  {isFFA ? (
                    <span className="terminal text-xs w-12 text-right" style={{ color: pos ? "var(--accent-cyan)" : "rgba(255,255,255,0.15)" }}>
                      {pos ? `+${FFA_PTS[pos] ?? 0}pts` : "—"}
                    </span>
                  ) : (
                  <input
                    type="number"
                    value={gameScores[player.id] || ""}
                    onChange={(e) => setGameScores((prev) => ({ ...prev, [player.id]: e.target.value }))}
                    placeholder="SCORE"
                    className="w-20 bg-black border border-white/15 px-2 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[var(--accent-cyan)] transition-colors terminal"
                  />
                  )}
                </div>
                );
              })}
            </div>
            <button
              onClick={handleSubmitResults}
              disabled={isSubmitting || Object.keys(placements).length < tournamentPlayers.length}
              className="w-full mt-4 py-3 font-bold text-sm tracking-widest uppercase transition-all disabled:opacity-30"
              style={{
                background: "var(--accent-cyan)",
                color: "#000",
                border: "1px solid var(--accent-cyan)",
              }}
            >
              {isSubmitting
                ? "GUARDANDO..."
                : match.type === "ffa"
                ? "▸ CONFIRMAR RESULTADO"
                : "▸ ENVIAR AL VAR"}
            </button>
          </motion.div>
        )}

        {/* PENDING_VALIDATION: Confirmation Panel */}
        {match?.status === "pending_validation" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="hud-panel p-5"
            style={{ borderColor: "rgba(250,204,21,0.3)" }}
          >
            <p className="tech-label mb-4" style={{ color: "#facc15" }}>
              ▸ ESPERANDO CONFIRMACIÓN — VAR
            </p>
            <div className="flex flex-col gap-3 mb-4">
              {results.map((result) => {
                const player = playerMap[result.playerId];
                if (!player) return null;
                return (
                  <div key={result.id} className="flex items-center gap-3">
                    <span className="text-lg">{player.avatarEmoji}</span>
                    <span className="flex-1 terminal text-xs font-bold" style={{ color: player.colorHex }}>
                      {player.name.toUpperCase()}
                    </span>
                    <span className="terminal text-xs text-white/40">{PLACEMENT_LABELS[result.placement - 1]}</span>
                    <span className="terminal text-sm font-bold" style={{ color: "var(--accent-cyan)" }}>
                      +{result.tournamentPoints}
                    </span>
                    <span className="w-3 h-3 flex-shrink-0" style={{
                      background: result.isConfirmed ? "var(--accent-cyan)" : "rgba(255,255,255,0.1)",
                    }} />
                  </div>
                );
              })}
            </div>
            {currentPlayer && !alreadyConfirmed && results.some((r) => r.playerId !== currentPlayer.id) && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleConfirm(true)}
                  disabled={isConfirming}
                  className="flex-1 py-3 font-bold text-sm tracking-widest uppercase transition-all disabled:opacity-30"
                  style={{ border: "1px solid var(--accent-cyan)", color: "var(--accent-cyan)" }}
                >
                  ✓ CONFIRMAR
                </button>
                <button
                  onClick={() => handleConfirm(false)}
                  disabled={isConfirming}
                  className="flex-1 py-3 font-bold text-sm tracking-widest uppercase transition-all disabled:opacity-30"
                  style={{ border: "1px solid var(--accent-red)", color: "var(--accent-red)" }}
                >
                  ✗ DISPUTAR
                </button>
              </div>
            )}
            {alreadyConfirmed && (
              <p className="terminal text-xs text-center" style={{ color: "var(--accent-cyan)" }}>
                ✓ RESULTADO CONFIRMADO
              </p>
            )}
          </motion.div>
        )}

        {/* DISPUTED: Host Resolution */}
        {match?.status === "disputed" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="hud-panel p-5"
            style={{ borderColor: "rgba(255,42,42,0.4)" }}
          >
            <p className="tech-label mb-2" style={{ color: "var(--accent-red)" }}>
              ▸ RESULTADO DISPUTADO
            </p>
            <p className="text-white/40 text-xs mb-4">
              Un jugador rechazó los resultados. El host debe resolver la disputa.
            </p>
            {isHost ? (
              <div className="flex gap-2">
                <button
                  onClick={() => handleHostAction("resolve")}
                  className="flex-1 py-3 font-bold text-sm tracking-widest uppercase transition-all"
                  style={{ border: "1px solid var(--accent-cyan)", color: "var(--accent-cyan)" }}
                >
                  ■ APROBAR
                </button>
                <button
                  onClick={() => handleHostAction("cancel")}
                  className="flex-1 py-3 font-bold text-sm tracking-widest uppercase transition-all border border-white/10 text-white/40 hover:border-[var(--accent-red)] hover:text-[var(--accent-red)] transition-colors"
                >
                  ✗ CANCELAR
                </button>
              </div>
            ) : (
              <p className="terminal text-xs text-center text-white/25">ESPERANDO AL HOST...</p>
            )}
          </motion.div>
        )}

        {/* FINISHED: Final Results */}
        {match?.status === "finished" && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="hud-panel p-5"
          >
            <p className="tech-label mb-4" style={{ color: "var(--accent-cyan)" }}>
              ▸ RESULTADO FINAL
            </p>
            <div className="flex flex-col gap-3">
              {[...results]
                .sort((a, b) => a.placement - b.placement)
                .map((result) => {
                  const player = playerMap[result.playerId];
                  if (!player) return null;
                  const isWinner = result.placement === 1;
                  return (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3"
                    >
                      <span
                        className="terminal text-xs w-5 text-center"
                        style={{ color: isWinner ? "var(--accent-cyan)" : "var(--muted)" }}
                      >
                        {PLACEMENT_LABELS[result.placement - 1]}
                      </span>
                      <span className="text-lg">{player.avatarEmoji}</span>
                      <span className="flex-1 terminal text-xs font-bold" style={{ color: player.colorHex }}>
                        {player.name.toUpperCase()}
                      </span>
                      {result.gameScore != null && (
                        <span className="terminal text-xs text-white/30">{result.gameScore}</span>
                      )}
                      <span
                        className="terminal text-base font-bold"
                        style={{ color: isWinner ? "var(--accent-cyan)" : "rgba(255,255,255,0.6)" }}
                      >
                        +{result.tournamentPoints}
                      </span>
                    </motion.div>
                  );
                })}
            </div>

            <div className="flex flex-col gap-2 mt-5">
              {match.gameSessionId && (
                <button
                  onClick={() => router.push(`/tournament/${tournamentId}/league/${match.gameSessionId}`)}
                  className="w-full py-3 font-bold text-sm tracking-widest uppercase transition-all"
                  style={{
                    background: "var(--accent-cyan)",
                    color: "#000",
                    border: "1px solid var(--accent-cyan)",
                  }}
                >
                  ← VOLVER A LA LIGA
                </button>
              )}
              <button
                onClick={() => router.push(`/tournament/${tournamentId}/match/${matchId}/rating`)}
                className="w-full py-3 font-bold text-sm tracking-widest uppercase border border-white/10 text-white/40 hover:border-[#a78bfa] hover:text-[#a78bfa] transition-colors"
              >
                ⭐ VER CALIFICACIÓN
              </button>
            </div>
          </motion.div>
        )}

        {/* VAR / Audit Log */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="hud-panel p-5"
        >
          <p className="tech-label mb-3">▸ VAR / AUDITORÍA</p>
          <div
            ref={auditRef}
            className="max-h-48 overflow-y-auto space-y-1"
            style={{
              background: "#030303",
              border: "1px solid rgba(255,255,255,0.05)",
              padding: "12px",
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
            }}
          >
            {auditLogs.length === 0 ? (
              <p className="text-white/20">$ SIN EVENTOS...</p>
            ) : (
              auditLogs.map((log) => {
                const player = playerMap[log.playerId];
                const time = new Date(log.createdAt).toLocaleTimeString("es-AR");
                return (
                  <div key={log.id} className="flex gap-2">
                    <span className="text-white/20 flex-shrink-0">[{time}]</span>
                    <span className="text-white/30">{ACTION_ICONS[log.action] ?? "·"}</span>
                    <span>
                      <span style={{ color: player?.colorHex || "#fafafa" }}>
                        {player?.name?.toUpperCase() || "?"}
                      </span>
                      <span className="text-white/30"> → </span>
                      <span className="text-white/50">{log.action.replace(/_/g, " ")}</span>
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
