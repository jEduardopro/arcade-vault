import type { Metadata } from "next";
import { HallBoard } from "@/app/components/hall-board";
import { getGames } from "@/app/lib/catalogue";
import { getLeaderboards } from "@/app/lib/leaderboard";

// The boards are read on every request: a mark saved in the player screen has to
// be here when you come back.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Salón de la Fama",
    description: "Las mejores puntuaciones de cada juego del Vault.",
};

// Hall of Fame screen of references/templates/salon.jsx. The board owns the
// whole layout because its selected tab drives the podium and the table; the
// catalogue and every board behind the tabs are read here, on the server, so
// switching tabs stays instant and needs no loading state.
export default async function HallOfFamePage() {
    const games = await getGames();
    const boards = await getLeaderboards(games.map((game) => game.id));

    return (
        <main className="av-main">
            <HallBoard games={games} boards={boards} />
        </main>
    );
}
