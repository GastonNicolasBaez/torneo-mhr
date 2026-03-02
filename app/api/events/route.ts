import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const tournamentId = request.nextUrl.searchParams.get("tournamentId");

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      // Send initial state
      if (tournamentId) {
        try {
          const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
          });
          if (tournament) {
            sendEvent("tournament", tournament);
          }

          const activeMatch = await prisma.match.findFirst({
            where: {
              tournamentId,
              status: { in: ["pending", "playing", "rating", "pending_validation", "disputed"] },
            },
            orderBy: { createdAt: "desc" },
          });
          if (activeMatch) {
            sendEvent("match", activeMatch);
          }
        } catch {
          // ignore db errors on initial connect
        }
      }

      // Keep alive
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(keepAlive);
        }
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
