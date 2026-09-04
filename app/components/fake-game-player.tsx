"use client";

// Fake match of references/templates/reproductor.jsx: no real game, just an
// automatic score behind the CRT frame. The HUD, the pause overlay and the end
// modal live in <PlayerShell>, so this component is only the timer and the CSS
// arena that stands in for a game.
//
// Every cartridge without an entry in the engine registry still lands here.

import { useEffect, useState } from "react";
import { PlayerShell } from "@/app/components/player-shell";
import type { Game } from "@/app/lib/games";

// Score and level travel together: the level goes up on the same tick that
// crosses a multiple of 2500, which is what the reference effect did.
type Run = { score: number; lives: number; level: number };

const START: Run = { score: 0, lives: 3, level: 1 };

export function FakeGamePlayer({ game }: { game: Game }) {
    const [run, setRun] = useState<Run>(START);
    const [paused, setPaused] = useState(false);
    const [over, setOver] = useState(false);

    useEffect(() => {
        if (over || paused) return;
        const t = setInterval(() => {
            const delta = Math.floor(10 + Math.random() * 90);
            setRun((prev) => {
                const score = prev.score + delta;
                return {
                    ...prev,
                    score,
                    level: score % 2500 < 100 ? prev.level + 1 : prev.level,
                };
            });
        }, 220);
        return () => clearInterval(t);
    }, [over, paused]);

    return (
        <PlayerShell
            game={game}
            score={run.score}
            lives={run.lives}
            level={run.level}
            paused={paused}
            over={over}
            onTogglePause={() => setPaused((p) => !p)}
            onEnd={() => setOver(true)}
            onRestart={() => {
                setRun(START);
                setPaused(false);
                setOver(false);
            }}
        >
            <div className="game-arena">
                <div className="grid-floor"></div>
                <div className="enemy e1"></div>
                <div className="enemy e2"></div>
                <div className="enemy e3"></div>
                <div className="player-ship"></div>
            </div>
        </PlayerShell>
    );
}
