import { cookies } from "next/headers";
import prisma from "./prisma";

const COOKIE_NAME = "currentPlayerId";

export async function getCurrentPlayer() {
  const cookieStore = await cookies();
  const playerId = cookieStore.get(COOKIE_NAME)?.value;
  if (!playerId) return null;
  return prisma.player.findUnique({ where: { id: playerId, isActive: true } });
}

export async function setCurrentPlayer(playerId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, playerId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearCurrentPlayer(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function verifyPin(playerId: string, pin: string): Promise<boolean> {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) return false;
  if (!player.pin) return true; // No PIN required
  return player.pin === pin;
}
