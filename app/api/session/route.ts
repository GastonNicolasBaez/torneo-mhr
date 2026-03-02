import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer, setCurrentPlayer, clearCurrentPlayer, verifyPin } from "@/lib/session";

export async function GET() {
  const player = await getCurrentPlayer();
  return NextResponse.json({ player });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { playerId, pin } = body;

  if (!playerId) {
    return NextResponse.json({ error: "playerId required" }, { status: 400 });
  }

  const valid = await verifyPin(playerId, pin || "");
  if (!valid) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  await setCurrentPlayer(playerId);
  const player = await getCurrentPlayer();
  return NextResponse.json({ player });
}

export async function DELETE() {
  await clearCurrentPlayer();
  return NextResponse.json({ ok: true });
}
