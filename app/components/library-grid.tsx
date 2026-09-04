"use client";

// Search box, category chips and grid of references/templates/biblioteca.jsx.
// Filtering stays in useState instead of the URL: eight games filter instantly
// in memory, and query params would navigate on every keystroke.

import { useMemo, useState } from "react";
import { GameCard } from "@/app/components/game-card";
import { CATS, GAMES } from "@/app/lib/games";

// The reference compared raw lowercase strings, which made the search
// accent-sensitive: "cai" never matched "CAÍDA". Folding diacritics first keeps
// the Spanish titles reachable from a plain keyboard.
const fold = (s: string) =>
    s
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();

export function LibraryGrid() {
    const [q, setQ] = useState("");
    const [cat, setCat] = useState<(typeof CATS)[number]>("TODOS");

    const filtered = useMemo(
        () =>
            GAMES.filter(
                (g) =>
                    (cat === "TODOS" || g.cat === cat) &&
                    fold(g.title).includes(fold(q)),
            ),
        [q, cat],
    );

    return (
        <>
            <div className="av-filters">
                <div className="av-search">
                    <span className="ico">⌕</span>
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Buscar un juego por nombre…"
                    />
                </div>
                <div className="av-chips">
                    {CATS.map((c) => (
                        <button
                            key={c}
                            className={"chip" + (cat === c ? " active" : "")}
                            onClick={() => setCat(c)}
                        >
                            {c}
                        </button>
                    ))}
                </div>
            </div>

            <div className="av-grid">
                {filtered.map((g) => (
                    <GameCard key={g.id} game={g} />
                ))}
                {filtered.length === 0 && (
                    <div
                        style={{
                            gridColumn: "1 / -1",
                            textAlign: "center",
                            padding: 80,
                            color: "var(--ink-faint)",
                        }}
                    >
                        <div
                            className="pixel"
                            style={{
                                fontSize: 14,
                                color: "var(--magenta)",
                                marginBottom: 12,
                            }}
                        >
                            NO HAY RESULTADOS
                        </div>
                        <div>Intenta otra búsqueda o categoría.</div>
                    </div>
                )}
            </div>
        </>
    );
}
