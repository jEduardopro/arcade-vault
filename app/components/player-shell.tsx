"use client";

// The chrome of the player screen, extracted verbatim from the fake GamePlayer
// of SPEC 01: the HUD bar, the CRT frame, the pause overlay and the end modal
// with its score-saving flow.
//
// It belongs to the screen, not to any game, so both the real cartridges and
// the seven that are still a CSS animation render through it. The markup and
// the class names are the ones references/templates/reproductor.jsx uses; only
// the values now come from props.

import Link from "next/link";
import { useState } from "react";
import type { Game } from "@/app/lib/games";
import { formatScore } from "@/app/lib/scores";
import { useSession } from "@/app/lib/session";

export type PlayerShellProps = {
    game: Game;
    score: number;
    lives: number;
    level: number;
    /** An extra HUD stat, such as the 3x countdown. Hidden when absent. */
    extraStat?: { label: string; value: string } | null;
    paused: boolean;
    over: boolean;
    onTogglePause: () => void;
    onEnd: () => void;
    /** Starts a new run. The shell clears its own saved-score state first. */
    onRestart: () => void;
    /** Whatever fills .crt-screen: a canvas, or the fake arena. */
    children: React.ReactNode;
};

export function PlayerShell({
    game,
    score,
    lives,
    level,
    extraStat = null,
    paused,
    over,
    onTogglePause,
    onEnd,
    onRestart,
    children,
}: PlayerShellProps) {
    const { user, saveScore } = useSession();
    const [saved, setSaved] = useState(false);
    // null means "untouched", so the field follows the session until it is edited.
    const [editedName, setEditedName] = useState<string | null>(null);

    const name = editedName ?? user?.name ?? "INVITADO";

    const restart = () => {
        setSaved(false);
        onRestart();
    };

    return (
        <div className="av-player fade-in">
            <div className="player-hud">
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                    <div className="hud-stat">
                        <div className="l">Jugador</div>
                        <div className="v" style={{ color: "var(--ink)" }}>
                            {name}
                        </div>
                    </div>
                    <div className="hud-stat">
                        <div className="l">Puntuación</div>
                        <div className="v">{formatScore(score)}</div>
                    </div>
                    <div className="hud-stat lives">
                        <div className="l">Vidas</div>
                        <div className="v">
                            {"♥ ".repeat(lives).trim() || "—"}
                        </div>
                    </div>
                    <div className="hud-stat level">
                        <div className="l">Nivel</div>
                        <div className="v">
                            {String(level).padStart(2, "0")}
                        </div>
                    </div>
                    {extraStat && (
                        <div className="hud-stat">
                            <div className="l">{extraStat.label}</div>
                            <div className="v">{extraStat.value}</div>
                        </div>
                    )}
                </div>
                <div className="hud-actions">
                    <button className="btn yellow" onClick={onTogglePause}>
                        {paused ? "REANUDAR" : "PAUSA"}
                    </button>
                    <button className="btn magenta" onClick={onEnd}>
                        FIN
                    </button>
                    <Link className="btn ghost" href={`/games/${game.id}`}>
                        SALIR
                    </Link>
                </div>
            </div>

            <div className="crt">
                <div className="crt-screen">
                    {children}
                    {paused && (
                        <div
                            className="crt-content"
                            style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
                        >
                            <div>
                                <div
                                    className="pixel neon-yellow"
                                    style={{ fontSize: 22 }}
                                >
                                    EN PAUSA
                                </div>
                                <div
                                    className="mono"
                                    style={{
                                        fontSize: 11,
                                        color: "var(--ink-dim)",
                                        marginTop: 10,
                                        letterSpacing: "0.16em",
                                    }}
                                >
                                    PULSA REANUDAR PARA CONTINUAR
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="crt-bottom">
                    <span className="led">SEÑAL OK</span>
                    <span>{game.title} · CRT-83 · 60 HZ</span>
                    <span>CARGA · 1MB</span>
                </div>
            </div>

            {over && (
                <div className="modal-bd">
                    <div className="modal">
                        <h2>FIN DEL JUEGO</h2>
                        <div className="final-label">PUNTUACIÓN FINAL</div>
                        <div className="final">{formatScore(score)}</div>
                        {!saved ? (
                            <div className="input-row">
                                <input
                                    value={name}
                                    onChange={(e) =>
                                        setEditedName(
                                            e.target.value
                                                .toUpperCase()
                                                .slice(0, 10),
                                        )
                                    }
                                    placeholder="TUS INICIALES"
                                />
                                <button
                                    className="btn yellow"
                                    onClick={() => {
                                        saveScore({
                                            game: game.id,
                                            score,
                                            name,
                                        });
                                        setSaved(true);
                                    }}
                                >
                                    GUARDAR PUNTUACIÓN
                                </button>
                            </div>
                        ) : (
                            <div className="toast-saved">
                                ▸ PUNTUACIÓN GUARDADA_
                            </div>
                        )}
                        <div className="actions">
                            <button className="btn" onClick={restart}>
                                JUGAR DE NUEVO
                            </button>
                            <Link className="btn magenta" href="/games">
                                VOLVER AL VAULT
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
