import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const games = await prisma.game.findMany({ orderBy: { orderIndex: "asc" } });
  return NextResponse.json({ games });
}

export async function POST(request: Request) {
  const body = await request.json();
  const game = await prisma.game.create({ data: body });
  return NextResponse.json({ game }, { status: 201 });
}
