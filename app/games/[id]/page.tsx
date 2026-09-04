import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CoverArt } from "@/app/components/cover-art";
import { Leaderboard } from "@/app/components/leaderboard";
import { getGame } from "@/app/lib/games";
import { formatScore, seededScores } from "@/app/lib/scores";

export async function generateMetadata({
    params,
}: PageProps<"/games/[id]">): Promise<Metadata> {
    const { id } = await params;
    const game = getGame(id);
    if (!game) return { title: "Cartucho no encontrado" };
    return { title: game.title, description: game.short };
}

// Detail screen of references/templates/detalle.jsx. Everything here is static
// text, so the whole page is a Server Component.
export default async function GameDetailPage({
    params,
}: PageProps<"/games/[id]">) {
    const { id } = await params;
    const game = getGame(id);
    if (!game) notFound();

    // Same seed as the reference, so the rows match the original screen.
    const scores = seededScores(id.length * 17 + 3, 10);

    return (
        <main className="av-main">
            <div className="av-detail fade-in">
                <div>
                    <div className="detail-cover">
                        <CoverArt cover={game.cover} />
                    </div>
                    <div style={{ marginTop: 20 }} className="detail-info">
                        <div className="detail-tags">
                            <span>{game.cat}</span>
                            <span>1 JUGADOR</span>
                            <span>TECLADO / TÁCTIL</span>
                            <span>RETRO 1985</span>
                        </div>
                        <h2 className="neon-cyan">{game.title}</h2>
                        <p>{game.long}</p>
                        <div className="stat-strip">
                            <div>
                                <div className="l">Partidas</div>
                                <div className="v">{game.plays}</div>
                            </div>
                            <div>
                                <div className="l">Mejor global</div>
                                <div
                                    className="v"
                                    style={{
                                        color: "var(--magenta)",
                                        textShadow:
                                            "0 0 6px rgba(255,0,110,0.5)",
                                    }}
                                >
                                    {formatScore(game.best)}
                                </div>
                            </div>
                            <div>
                                <div className="l">Dificultad</div>
                                <div
                                    className="v"
                                    style={{
                                        color: "var(--yellow)",
                                        textShadow:
                                            "0 0 6px rgba(245,255,0,0.5)",
                                    }}
                                >
                                    ★ ★ ★ ☆ ☆
                                </div>
                            </div>
                        </div>
                        <div className="detail-actions">
                            <Link
                                className="btn xl pulse"
                                href={`/games/${game.id}/play`}
                            >
                                ▶ JUGAR AHORA
                            </Link>
                            <Link className="btn ghost lg" href="/games">
                                VOLVER AL VAULT
                            </Link>
                        </div>
                    </div>
                </div>

                <aside>
                    <Leaderboard rows={scores} />
                </aside>
            </div>
        </main>
    );
}
