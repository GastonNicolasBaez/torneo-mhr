import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await prisma.player.findUnique({ where: { id } });
  if (!player) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ player });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { name, avatarEmoji, colorHex, pin, isActive } = body;

  const player = await prisma.player.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(avatarEmoji !== undefined && { avatarEmoji }),
      ...(colorHex !== undefined && { colorHex }),
      ...(pin !== undefined && { pin }),
      ...(isActive !== undefined && { isActive }),
    },
  });
  return NextResponse.json({ player });
}
