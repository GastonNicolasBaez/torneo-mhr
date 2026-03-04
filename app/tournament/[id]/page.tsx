"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentPlayer } from "@/contexts/PlayerContext";
import { TournamentProvider, useTournament } from "@/contexts/TournamentContext";

interface Player {
  id: string;
  name: string;
  avatarEmoji: string;
  colorHex: string;
}

interface LeaderboardEntry {
  playerId: string;
  totalScore: number;
  wins: number;
  matchesPlayed: number;
}

interface Match {
  id: string;
  gameId: string;
  type: string;
  status: string;
  roundNumber: number;
  isMemeMatch: boolean;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  finished: "DONE",
  playing: "LIVE",
  disputed: "DISPUTE",
  cancelled: "VOID",
  pending_validation: "VAR",
  rating: "RATING",
  pending: "PENDING",
};

const STATUS_COLOR: Record<string, string> = {
  finished: "var(--accent-cyan)",
  playing: "#ffffff",
  disputed: "var(--accent-red)",
  cancelled: "#52525b",
  pending_validation: "#facc15",
  rating: "#a78bfa",
  pending: "#52525b",
};

function TournamentDashboardInner() {
  const params = useParams();
  const router = useRouter();
  const { currentPlayer } = useCurrentPlayer();
  const { tournament } = useTournament();
  const [players, setPlayers] = useState<Player[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [games, setGames] = useState<Record<string, { name: string }>>({});
  const [isClosing, setIsClosing] = useState(false);
  const [tick, setTick] = useState(0); // for clock

  const tournamentId = params.id as string;

  const loadData = useCallback(async () => {
    const [tRes, mRes, gRes] = await Promise.all([
      fetch(`/api/tournaments/${tournamentId}`),
      fetch(`/api/tournaments/${tournamentId}/matches`),
      fetch("/api/games"),
    ]);
    if (tRes.ok) {
      const d = await tRes.json();
      setPlayers(d.players || []);
      setLeaderboard(d.leaderboard || []);
    }
    if (mRes.ok) {
      const d = await mRes.json();
      setRecentMatches((d.matches || []).slice(0, 8));
    }
    if (gRes.ok) {
      const d = await gRes.json();
      const m: Record<string, { name: string }> = {};
      for (const g of d.games || []) m[g.id] = { name: g.name };
      setGames(m);
    }
  }, [tournamentId]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));
  const isHost = tournament?.hostId === currentPlayer?.id;

  const activeMatch = recentMatches.find((m) =>
    ["playing", "rating", "pending_validation", "disputed"].includes(m.status)
  );

  const handleCloseTournament = async () => {
    if (!confirm("¿Cerrar el torneo definitivamente?")) return;
    setIsClosing(true);
    await fetch(`/api/tournaments/${tournamentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "finished" }),
    });
    router.push(`/tournament/${tournamentId}/winner`);
  };

  const now = new Date();
  const timeStr = now.toTimeString().slice(0, 8);
  void tick; // used only to trigger re-render for clock

  return (
    <div className="min-h-screen bg-black text-zinc-100" style={{ fontFamily: "var(--font-mono, monospace)" }}>

      {/* ── TOP BAR ── */}
      <header className="border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="tech-label" style={{ color: "var(--accent-cyan)" }}>
            ▸ TORNEO MHR
          </span>
          <span className="text-white/20 text-xs">|</span>
          <span className="tech-label">{tournament?.name ?? "—"}</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="terminal text-xs text-white/30">{timeStr}</span>
          <nav className="flex items-center gap-5">
            <button
              className="nav-link text-xs"
              onClick={() => router.push(`/tournament/${tournamentId}/bracket`)}
            >
              HISTORIAL
            </button>
            <button
              className="nav-link text-xs"
              onClick={() => router.push("/tv")}
            >
              TV
            </button>
            {isHost && (
              <button
                className="nav-link text-xs"
                onClick={() => router.push("/admin")}
              >
                ADMIN
              </button>
            )}
          </nav>
          {currentPlayer && (
            <span className="tech-label flex items-center gap-1">
              <span>{currentPlayer.avatarEmoji}</span>
              <span style={{ color: currentPlayer.colorHex }}>{currentPlayer.name}</span>
            </span>
          )}
        </div>
      </header>

      {/* ── LIVE MATCH ALERT ── */}
      <AnimatePresence>
        {activeMatch && (
          <motion.button
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onClick={() => router.push(`/tournament/${tournamentId}/match/${activeMatch.id}`)}
            className="w-full border-b border-white/10 px-6 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <motion.span
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="w-1.5 h-1.5 bg-white inline-block"
            />
            <span className="tech-label" style={{ color: "var(--accent-cyan)" }}>
              LIVE
            </span>
            <span className="text-xs text-white/60">
              {games[activeMatch.gameId]?.name ?? "—"} &nbsp;·&nbsp; {activeMatch.type.toUpperCase()} &nbsp;·&nbsp; R{activeMatch.roundNumber}
            </span>
            <span className="ml-auto text-xs text-white/30">TAP TO VIEW →</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── MAIN GRID ── */}
      <main className="px-6 py-6 grid grid-cols-1 md:grid-cols-12 gap-6 max-w-6xl mx-auto">

        {/* ── LEADERBOARD (left, wide) ── */}
        <section className="md:col-span-7 hud-panel p-0 overflow-hidden">
          {/* Panel header */}
          <div className="border-b border-white/10 px-5 py-3 flex items-center justify-between">
            <span className="tech-label" style={{ color: "var(--accent-cyan)" }}>
              ▸ CLASIFICACIÓN
            </span>
            <span className="terminal text-xs text-white/20">{players.length} PLAYERS</span>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[2rem_1fr_3rem_3rem_4rem] gap-x-4 px-5 py-2 border-b border-white/5">
            {["#", "JUGADOR", "PJ", "W", "PTS"].map((h) => (
              <span key={h} className="tech-label text-center first:text-left">{h}</span>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/5">
            {leaderboard.length === 0 && (
              <div className="px-5 py-10 text-center">
                <p className="tech-label">SIN DATOS</p>
                <p className="text-white/20 text-xs mt-1">Girá la ruleta para empezar</p>
              </div>
            )}
            {leaderboard.map((entry, i) => {
              const player = playerMap[entry.playerId];
              if (!player) return null;
              const isFirst = i === 0;
              return (
                <motion.div
                  key={entry.playerId}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="grid grid-cols-[2rem_1fr_3rem_3rem_4rem] gap-x-4 px-5 py-3 items-center hover:bg-white/5 transition-colors"
                  style={isFirst ? { background: "rgba(0,240,255,0.04)" } : {}}
                >
                  {/* Rank */}
                  <span className="terminal text-sm text-center"
                    style={{ color: isFirst ? "var(--accent-cyan)" : "var(--muted)" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  {/* Player */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base leading-none">{player.avatarEmoji}</span>
                    <span className="text-sm font-medium truncate" style={{ color: player.colorHex }}>
                      {player.name}
                    </span>
                    {isFirst && (
                      <span className="text-xs" style={{ color: "var(--accent-cyan)" }}>◀</span>
                    )}
                  </div>

                  {/* PJ */}
                  <span className="terminal text-xs text-center text-white/40">
                    {entry.matchesPlayed}
                  </span>

                  {/* Wins */}
                  <span className="terminal text-xs text-center text-white/40">
                    {entry.wins}
                  </span>

                  {/* Score */}
                  <span
                    className="terminal text-right text-base font-bold"
                    style={{ color: isFirst ? "var(--accent-cyan)" : "rgba(255,255,255,0.85)" }}
                  >
                    {entry.totalScore}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ── RIGHT COLUMN ── */}
        <div className="md:col-span-5 flex flex-col gap-6">

          {/* ── ACTIONS ── */}
          <section className="hud-panel p-0 overflow-hidden">
            <div className="border-b border-white/10 px-5 py-3">
              <span className="tech-label" style={{ color: "var(--accent-cyan)" }}>
                ▸ ACCIONES
              </span>
            </div>
            <div className="p-4 flex flex-col gap-2">
              {/* Primary: Spin */}
              <motion.button
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(`/tournament/${tournamentId}/spin`)}
                className="w-full py-4 border border-white/20 text-left px-4 flex items-center justify-between group hover:border-[var(--accent-cyan)] transition-colors"
              >
                <span className="flex items-center gap-3">
                  <span className="text-lg">🎰</span>
                  <span className="text-sm tracking-widest uppercase font-bold text-white">
                    GIRAR RULETA
                  </span>
                </span>
                <span className="tech-label text-white/20 group-hover:text-[var(--accent-cyan)] transition-colors">
                  →
                </span>
              </motion.button>

              {/* Active match shortcut */}
              {activeMatch && (
                <motion.button
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push(`/tournament/${tournamentId}/match/${activeMatch.id}`)}
                  className="w-full py-3 border border-white/10 text-left px-4 flex items-center justify-between group hover:border-white/30 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <motion.span
                      animate={{ opacity: [1, 0.2, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="w-1.5 h-1.5 bg-white inline-block"
                    />
                    <span className="text-sm tracking-widest uppercase text-white/60 group-hover:text-white transition-colors">
                      VER PARTIDA ACTIVA
                    </span>
                  </span>
                  <span className="tech-label text-white/20 group-hover:text-white/60 transition-colors">→</span>
                </motion.button>
              )}

              {/* History */}
              <motion.button
                whileHover={{ x: 4 }}
                onClick={() => router.push(`/tournament/${tournamentId}/bracket`)}
                className="w-full py-3 border border-white/10 text-left px-4 flex items-center justify-between group hover:border-white/30 transition-colors"
              >
                <span className="text-sm tracking-widest uppercase text-white/40 group-hover:text-white/70 transition-colors">
                  HISTORIAL DE PARTIDAS
                </span>
                <span className="tech-label text-white/10 group-hover:text-white/40 transition-colors">→</span>
              </motion.button>

              {/* Close tournament */}
              {isHost && (
                <motion.button
                  whileHover={{ x: 4 }}
                  onClick={handleCloseTournament}
                  disabled={isClosing}
                  className="w-full py-3 border border-white/5 text-left px-4 flex items-center justify-between group hover:border-red-500/50 transition-colors mt-2 disabled:opacity-30"
                >
                  <span className="text-sm tracking-widest uppercase text-white/20 group-hover:text-red-400 transition-colors">
                    {isClosing ? "CERRANDO..." : "CERRAR TORNEO"}
                  </span>
                  <span className="tech-label text-white/10 group-hover:text-red-400/50 transition-colors">⏻</span>
                </motion.button>
              )}
            </div>
          </section>

          {/* ── RECENT MATCHES ── */}
          <section className="hud-panel p-0 overflow-hidden flex-1">
            <div className="border-b border-white/10 px-5 py-3 flex items-center justify-between">
              <span className="tech-label" style={{ color: "var(--accent-cyan)" }}>
                ▸ ÚLTIMAS PARTIDAS
              </span>
              <span className="terminal text-xs text-white/20">{recentMatches.length}</span>
            </div>

            <div className="divide-y divide-white/5">
              {recentMatches.length === 0 && (
                <div className="px-5 py-8 text-center">
                  <p className="tech-label">VACÍO</p>
                </div>
              )}
              {recentMatches.map((match, i) => (
                <motion.button
                  key={match.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => router.push(`/tournament/${tournamentId}/match/${match.id}`)}
                  className="w-full px-5 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                >
                  {/* Status dot */}
                  <span
                    className="w-1 h-4 flex-shrink-0"
                    style={{ background: STATUS_COLOR[match.status] ?? "#52525b" }}
                  />
                  {/* Game name */}
                  <span className="flex-1 text-xs text-white/70 truncate">
                    {games[match.gameId]?.name ?? "—"}
                  </span>
                  {/* Type + Round */}
                  <span className="terminal text-xs text-white/25">
                    {match.type.toUpperCase()} R{match.roundNumber}
                    {match.isMemeMatch ? " 🎭" : ""}
                  </span>
                  {/* Status */}
                  <span
                    className="terminal text-xs w-16 text-right"
                    style={{ color: STATUS_COLOR[match.status] ?? "#52525b" }}
                  >
                    {STATUS_LABEL[match.status] ?? match.status}
                  </span>
                </motion.button>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default function TournamentPage() {
  const params = useParams();
  const tournamentId = params.id as string;
  return (
    <TournamentProvider tournamentId={tournamentId}>
      <TournamentDashboardInner />
    </TournamentProvider>
  );
}
