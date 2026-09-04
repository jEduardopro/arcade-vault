"use client";

// The real BLOQUE BUSTER cartridge: the canvas plus the glue that turns what
// the engine reports into React state. Everything around it — HUD, pause
// overlay, end modal — belongs to <PlayerShell>.
//
// Same shape as caida-game.tsx and asteroides-game.tsx, because the boundary
// SPEC 05 drew is the same one: the engine lives in a ref, not in state, since
// it is a mutable object with a lifetime tied to the mount and re-rendering
// must never build a second one.

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    useSyncExternalStore,
} from "react";
import { PlayerShell } from "@/app/components/player-shell";
import { LEVELS, RUN } from "@/app/lib/engines/bloque-buster/constants";
import {
    createBloqueBusterEngine,
    type EngineHandle,
    type GameSnapshot,
    type GameStatus,
} from "@/app/lib/engines/bloque-buster/engine";
import type { Game } from "@/app/lib/games";

// What the first paint shows, before the engine's own restart() reports in.
const INITIAL: GameSnapshot = {
    score: 0,
    lives: RUN.lives,
    level: 1,
    blocks: LEVELS[0].length,
};

// The mouse leads because in an Arkanoid it is the instrument, not an extra:
// the arrows are the fallback for whoever prefers the keyboard.
const CONTROLS = [
    { keys: "RATÓN / ← →", action: "MOVER" },
    { keys: "ESPACIO", action: "LANZAR" },
    { keys: "P", action: "PAUSA" },
] as const;

// A coarse pointer means a touch device, where this game cannot be played: a
// finger cannot hold a paddle steady, and there are no touch controls. It is
// external browser state, so it is read the same way app/lib/session.tsx reads
// localStorage: through a store, never with setState inside an effect.
const COARSE_POINTER = "(pointer: coarse)";

function subscribeToPointer(onChange: () => void) {
    const query = window.matchMedia(COARSE_POINTER);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
}

function getPointerSnapshot() {
    return window.matchMedia(COARSE_POINTER).matches;
}

/** Assume a keyboard when there is no window: the client corrects it. */
function getPointerServerSnapshot() {
    return false;
}

/** Same treatment as the pause overlay, one layer below it. */
function Overlay({ children }: { children: React.ReactNode }) {
    return (
        <div
            className="crt-content"
            style={{ background: "rgba(0,0,0,0.72)", zIndex: 4 }}
        >
            <div>{children}</div>
        </div>
    );
}

function ControlList() {
    return (
        <div
            className="mono"
            style={{
                fontSize: 11,
                color: "var(--ink-dim)",
                letterSpacing: "0.16em",
                display: "grid",
                gap: 6,
            }}
        >
            {CONTROLS.map((control) => (
                <div key={control.action}>
                    <span style={{ color: "var(--ink)" }}>{control.keys}</span>
                    {"  "}
                    {control.action}
                </div>
            ))}
        </div>
    );
}

export default function BloqueBusterGame({ game }: { game: Game }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<EngineHandle | null>(null);

    const [snapshot, setSnapshot] = useState<GameSnapshot>(INITIAL);
    const [status, setStatus] = useState<GameStatus>("ready");

    const needsKeyboard = useSyncExternalStore(
        subscribeToPointer,
        getPointerSnapshot,
        getPointerServerSnapshot,
    );

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const engine = createBloqueBusterEngine(canvas, {
            snapshot: setSnapshot,
            status: setStatus,
        });
        engineRef.current = engine;

        // Cleanup is what keeps StrictMode's double mount from leaving two
        // loops running: the first engine is destroyed before the second one
        // exists.
        return () => {
            engine.destroy();
            engineRef.current = null;
        };
    }, []);

    const togglePause = useCallback(() => {
        const engine = engineRef.current;
        if (!engine) return;
        if (status === "paused") engine.resume();
        else engine.pause();
    }, [status]);

    const end = useCallback(() => engineRef.current?.end(), []);
    const restart = useCallback(() => engineRef.current?.restart(), []);

    return (
        <PlayerShell
            game={game}
            score={snapshot.score}
            lives={snapshot.lives}
            level={snapshot.level}
            extraStat={{ label: "BLOQUES", value: String(snapshot.blocks) }}
            paused={status === "paused"}
            over={status === "over"}
            onTogglePause={togglePause}
            onEnd={end}
            onRestart={restart}
        >
            <canvas
                ref={canvasRef}
                className="game-canvas"
                aria-label={`${game.title}: juego de romper bloques en canvas, se controla con el ratón o el teclado`}
            />

            {status === "ready" &&
                (needsKeyboard ? (
                    <Overlay>
                        <div
                            className="pixel neon-magenta"
                            style={{ fontSize: 18 }}
                        >
                            SE REQUIERE TECLADO
                        </div>
                        <div style={{ marginTop: 16 }}>
                            <ControlList />
                        </div>
                    </Overlay>
                ) : (
                    <Overlay>
                        <div
                            className="pixel neon-cyan"
                            style={{ fontSize: 22 }}
                        >
                            {game.title}
                        </div>
                        <div style={{ marginTop: 18 }}>
                            <ControlList />
                        </div>
                        <div
                            className="pixel neon-yellow"
                            style={{ fontSize: 12, marginTop: 22 }}
                        >
                            ▸ PULSA ESPACIO
                            <span
                                style={{
                                    animation: "blink 1s steps(1) infinite",
                                }}
                            >
                                _
                            </span>
                        </div>
                    </Overlay>
                ))}
        </PlayerShell>
    );
}
