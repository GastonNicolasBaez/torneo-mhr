import { NextResponse } from "next/server";
import { getActiveTournament } from "@/lib/tournament-state";

export async function GET() {
  const tournament = await getActiveTournament();
  return NextResponse.json({ tournament });
}
