import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const game = await prisma.game.update({ where: { id }, data: body });
  return NextResponse.json({ game });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.game.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
