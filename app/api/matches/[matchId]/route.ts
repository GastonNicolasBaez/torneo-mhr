import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const results = await prisma.matchResult.findMany({ where: { matchId } });
  const auditLogs = await prisma.auditLog.findMany({
    where: { matchId },
    orderBy: { createdAt: "asc" },
  });
  const ratings = await prisma.gameRating.findMany({ where: { matchId } });

  return NextResponse.json({ match, results, auditLogs, ratings });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const body = await request.json();
  const { status, winnerId } = body;

  const update: Record<string, unknown> = {};
  if (status !== undefined) {
    update.status = status;
    if (status === "playing") update.startedAt = new Date();
    if (status === "finished") update.finishedAt = new Date();
  }
  if (winnerId !== undefined) update.winnerId = winnerId;

  const match = await prisma.match.update({ where: { id: matchId }, data: update });
  return NextResponse.json({ match });
}
