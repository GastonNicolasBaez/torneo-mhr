import { redirect } from "next/navigation";
import { getCurrentPlayer } from "@/lib/session";
import { getActiveTournament } from "@/lib/tournament-state";

export default async function Home() {
  const player = await getCurrentPlayer();

  if (!player) {
    redirect("/select-player");
  }

  const tournament = await getActiveTournament();

  if (tournament) {
    redirect(`/tournament/${tournament.id}`);
  }

  redirect("/lobby");
}
