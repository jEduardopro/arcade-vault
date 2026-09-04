import type { Metadata } from "next";
import { LibraryGrid } from "@/app/components/library-grid";
import { getGames } from "@/app/lib/catalogue";

export const metadata: Metadata = {
    title: "Biblioteca",
    description: "El catálogo completo de Arcade Vault. Busca, filtra y juega.",
};

// Library screen of references/templates/biblioteca.jsx. It used to live at "/",
// which the landing now owns, so it sits at the index of the /games segment its
// detail and player routes already use. The hero is static text, so it ships as
// HTML; the catalogue is read here, on the server, and only the filters and the
// grid are a client island.
export default async function LibraryPage() {
    const games = await getGames();

    return (
        <main className="av-main">
            <div className="fade-in">
                <section className="av-hero">
                    <h1 className="flicker">ARCADE VAULT</h1>
                    <div className="sub">
                        INSERTA UNA MONEDA PARA JUGAR{" "}
                        <span className="blink">_</span>
                    </div>
                </section>

                <LibraryGrid games={games} />
            </div>
        </main>
    );
}
