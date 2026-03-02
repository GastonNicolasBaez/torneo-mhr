"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

interface Tournament {
  id: string;
  name: string;
  status: "lobby" | "active" | "tiebreak" | "finished";
  format: string;
  pointSystem: string;
  winnerId?: string | null;
  hostId: string;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
}

interface TournamentContextValue {
  tournament: Tournament | null;
  setTournament: (t: Tournament | null) => void;
  refreshTournament: () => Promise<void>;
  isLoading: boolean;
}

const TournamentContext = createContext<TournamentContextValue>({
  tournament: null,
  setTournament: () => {},
  refreshTournament: async () => {},
  isLoading: true,
});

export function TournamentProvider({ children, tournamentId }: { children: ReactNode; tournamentId?: string }) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshTournament = useCallback(async () => {
    const id = tournamentId || tournament?.id;
    if (!id) return;
    try {
      const res = await fetch(`/api/tournaments/${id}`);
      const data = await res.json();
      if (data.tournament) setTournament(data.tournament);
    } catch {
      // ignore
    }
  }, [tournamentId, tournament?.id]);

  useEffect(() => {
    if (!tournamentId) {
      setIsLoading(false);
      return;
    }
    fetch(`/api/tournaments/${tournamentId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.tournament) setTournament(data.tournament);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [tournamentId]);

  // SSE subscription
  useEffect(() => {
    const id = tournamentId || tournament?.id;
    if (!id) return;
    const es = new EventSource(`/api/events?tournamentId=${id}`);
    es.addEventListener("tournament", (e) => {
      try { setTournament(JSON.parse(e.data)); } catch {}
    });
    return () => es.close();
  }, [tournamentId, tournament?.id]);

  return (
    <TournamentContext.Provider value={{ tournament, setTournament, refreshTournament, isLoading }}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  return useContext(TournamentContext);
}
