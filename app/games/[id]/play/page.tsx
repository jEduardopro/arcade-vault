import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GamePlayer } from "@/app/components/game-player";
import { getGame } from "@/app/lib/games";

export async function generateMetadata({
    params,
}: PageProps<"/games/[id]/play">): Promise<Metadata> {
    const { id } = await params;
    const game = getGame(id);
    if (!game) return { title: "Cartucho no encontrado" };
    return { title: `Jugando ${game.title}`, description: game.short };
}

// Player screen. The page only resolves the game; the match itself is a client
// island because it runs on a timer and keeps its own state.
export default async function GamePlayPage({
    params,
}: PageProps<"/games/[id]/play">) {
    const { id } = await params;
    const game = getGame(id);
    if (!game) notFound();

    return (
        <main className="av-main">
            <GamePlayer game={game} />
        </main>
    );
}
