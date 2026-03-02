import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const players = await prisma.player.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ players });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, avatarEmoji, colorHex, pin } = body;

  if (!name || !avatarEmoji || !colorHex) {
    return NextResponse.json({ error: "name, avatarEmoji, colorHex required" }, { status: 400 });
  }

  const player = await prisma.player.create({
    data: { name, avatarEmoji, colorHex, pin: pin || null },
  });
  return NextResponse.json({ player }, { status: 201 });
}
