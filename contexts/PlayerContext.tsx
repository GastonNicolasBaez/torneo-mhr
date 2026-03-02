"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface Player {
  id: string;
  name: string;
  avatarEmoji: string;
  colorHex: string;
  pin?: string | null;
  isActive: boolean;
  createdAt: string;
}

interface PlayerContextValue {
  currentPlayer: Player | null;
  setCurrentPlayer: (player: Player | null) => void;
  isLoading: boolean;
}

const PlayerContext = createContext<PlayerContextValue>({
  currentPlayer: null,
  setCurrentPlayer: () => {},
  isLoading: true,
});

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.player) setCurrentPlayer(data.player);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <PlayerContext.Provider value={{ currentPlayer, setCurrentPlayer, isLoading }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function useCurrentPlayer() {
  return useContext(PlayerContext);
}
