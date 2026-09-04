"use client";

// Hall of Fame board of references/templates/salon.jsx. The whole board is a
// client island: the selected tab drives the podium and the table at once, so
// splitting it would mean lifting that state into the URL.

import Link from "next/link";
import { useState } from "react";
import type { Game } from "@/app/lib/games";
import { formatScore, type ScoreRow } from "@/app/lib/scores";
import { useSession } from "@/app/lib/session";

export function HallBoard({
    games,
    boards,
}: {
    games: Game[];
    boards: Record<string, ScoreRow[]>;
}) {
    const { user } = useSession();
    // The selected game is kept whole, so the title needs no second lookup.
    // games[0] can be undefined now that the catalogue is a query, so the empty
    // board below returns before anything reads the tab.
    const [tab, setTab] = useState<Game | undefined>(games[0]);

    // Every board arrived with the page, so changing tab is a lookup.
    const rows = (tab && boards[tab.id]) || [];

    // The reference invented this row with `8 + (id.length % 4)`. With real marks
    // next to it that stops being a mock-up and becomes a lie, so now it is the
    // player's own row or nothing at all.
    const you = user
        ? rows.find((row) => row.name === user.name.toUpperCase())
        : undefined;

    // An empty catalogue means the query failed or the seed never ran. It is a
    // screen nobody could reach while the games were an array in the bundle.
    if (!tab) {
        return (
            <div className="av-hall fade-in">
                <div className="hall-head">
                    <h1>SALÓN DE LA FAMA</h1>
                    <p className="pixel" style={{ fontSize: 10 }}>
                        LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
                    </p>
                </div>
                <div
                    style={{
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
                        SIN SEÑAL
                    </div>
                    <div>No pudimos leer el catálogo de cartuchos.</div>
                </div>
                <div style={{ textAlign: "center", marginTop: 32 }}>
                    <Link className="btn lg" href="/games">
                        VOLVER A LA BIBLIOTECA
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="av-hall fade-in">
            <div className="hall-head">
                <h1>SALÓN DE LA FAMA</h1>
                <p className="pixel" style={{ fontSize: 10 }}>
                    LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
                </p>
            </div>

            <div className="hall-tabs">
                {games.map((g) => (
                    <button
                        key={g.id}
                        className={"chip" + (tab.id === g.id ? " active" : "")}
                        onClick={() => setTab(g)}
                    >
                        {g.title}
                    </button>
                ))}
            </div>

            {/* A board can now hold fewer than three marks, so every step of the
                podium is drawn only when there is somebody standing on it. */}
            {rows.length > 0 && (
                <div className="podium">
                    {rows[1] && (
                        <div className="podium-slot silver">
                            <div className="rank-num">02</div>
                            <div className="name">{rows[1].name}</div>
                            <div className="score">
                                {formatScore(rows[1].score)}
                            </div>
                            <div className="date">{rows[1].date}</div>
                        </div>
                    )}
                    <div className="podium-slot gold">
                        <div
                            className="pixel"
                            style={{
                                fontSize: 9,
                                color: "var(--gold)",
                                letterSpacing: "0.18em",
                            }}
                        >
                            CAMPEÓN
                        </div>
                        <div
                            className="rank-num"
                            style={{ fontSize: 36, marginTop: 4 }}
                        >
                            01
                        </div>
                        <div className="name">{rows[0].name}</div>
                        <div className="score" style={{ fontSize: 20 }}>
                            {formatScore(rows[0].score)}
                        </div>
                        <div className="date">{rows[0].date}</div>
                    </div>
                    {rows[2] && (
                        <div className="podium-slot bronze">
                            <div className="rank-num">03</div>
                            <div className="name">{rows[2].name}</div>
                            <div className="score">
                                {formatScore(rows[2].score)}
                            </div>
                            <div className="date">{rows[2].date}</div>
                        </div>
                    )}
                </div>
            )}

            <div className="hall-table">
                <div className="th">
                    <div>RANGO</div>
                    <div>JUGADOR</div>
                    <div>PUNTUACIÓN</div>
                    <div>FECHA</div>
                </div>
                {rows.map((r, i) => (
                    <div
                        key={r.name + i}
                        className={
                            "tr" +
                            (i === 0
                                ? " top1"
                                : i === 1
                                  ? " top2"
                                  : i === 2
                                    ? " top3"
                                    : "")
                        }
                        style={{ animationDelay: `${i * 50}ms` }}
                    >
                        <div className="rk">
                            #{String(r.rank).padStart(2, "0")}
                        </div>
                        <div className="pl">{r.name}</div>
                        <div className="sc">{formatScore(r.score)}</div>
                        <div className="dt">{r.date}</div>
                    </div>
                ))}
                {rows.length === 0 && (
                    <div
                        style={{
                            padding: 48,
                            textAlign: "center",
                            color: "var(--ink-faint)",
                        }}
                    >
                        Todavía no hay marcas en {tab.title}. La primera puede
                        ser la tuya.
                    </div>
                )}
                {you && (
                    <>
                        <div className="tr you-label">
                            ▸ TU MEJOR MARCA EN {tab.title}
                        </div>
                        <div
                            className="tr you"
                            style={{
                                animationDelay: `${rows.length * 50 + 50}ms`,
                            }}
                        >
                            <div
                                className="rk"
                                style={{ color: "var(--yellow)" }}
                            >
                                #{String(you.rank).padStart(2, "0")}
                            </div>
                            <div
                                className="pl"
                                style={{ color: "var(--yellow)" }}
                            >
                                {you.name}
                            </div>
                            <div
                                className="sc"
                                style={{
                                    color: "var(--yellow)",
                                    textShadow: "0 0 6px rgba(245,255,0,0.5)",
                                }}
                            >
                                {formatScore(you.score)}
                            </div>
                            <div className="dt">{you.date}</div>
                        </div>
                    </>
                )}
            </div>

            <div style={{ textAlign: "center", marginTop: 32 }}>
                <Link className="btn lg" href="/games">
                    VOLVER A LA BIBLIOTECA
                </Link>
            </div>
        </div>
    );
}
