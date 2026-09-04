// The game loop and the border between the game and React, for CAÍDA.
//
// The same four rules SPEC 05 set, which are what keep this module reusable:
//
//   1. It knows nothing about React, and nothing about the DOM beyond its own
//      canvas and the window it listens to for keys.
//   2. It draws no HUD and no overlays. updateHUD(), the shared PAUSA /
//      GAME OVER overlay and the Reiniciar button of game.js are gone: that
//      information travels through `snapshot` and `status`, and React paints
//      it. Not a single character of text is drawn inside the canvas.
//   3. `snapshot` is emitted only when a value actually changes, never once per
//      frame.
//   4. destroy() is part of the contract. Whoever creates an engine must call
//      it, or the loop and the listeners outlive the component.
//
// The internal state that never leaves this file: dropAccum and dropInterval.

import {
    DROP,
    KICKS,
    LEVEL,
    LINE_SCORES,
    MAX_DT,
    PALETTE,
    SCORE,
    WORLD,
} from "@/app/lib/engines/caida/constants";
import {
    drawPreview,
    randomPiece,
    Well,
} from "@/app/lib/engines/caida/entities";

/**
 * What the player sees the game doing.
 *
 *   ready   → the well is drawn but frozen, waiting for the start overlay
 *   playing ⇄ paused
 *   playing → over, either because a spawning piece collides or through end()
 */
export type GameStatus = "ready" | "playing" | "paused" | "over";

export type GameSnapshot = {
    score: number;
    /** Always 0: CAÍDA has no lives, and PlayerShell renders "—" for it. */
    lives: number;
    level: number;
    /** Rows cleared in this run. The game-specific field of this engine. */
    lines: number;
};

export type EngineHandle = {
    /** "ready" → "playing". Ignored from any other status. */
    start(): void;
    pause(): void;
    resume(): void;
    /** Forced game over, from the FIN button. */
    end(): void;
    /** Back to "ready", with an empty well drawn behind the start overlay. */
    restart(): void;
    /** Cancels the loop and removes every listener. Always call it. */
    destroy(): void;
};

export type EngineCallbacks = {
    snapshot: (snapshot: GameSnapshot) => void;
    status: (status: GameStatus) => void;
};

/** Keys the game owns: while playing, they must not scroll the page. */
const GAME_KEYS = new Set([
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "Space",
]);

/**
 * Backing-store cap. Past 2x the extra pixels buy nothing visible and cost
 * real fill rate on a 60 fps loop.
 */
const MAX_DPR = 2;

export function createCaidaEngine(
    canvas: HTMLCanvasElement,
    on: EngineCallbacks,
): EngineHandle {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("2D canvas context unavailable");
    // Re-bound to a non-nullable const: the narrowing above does not survive
    // into the closures below.
    const ctx = context;

    // ── State ────────────────────────────────────────────────────────────────

    const well = new Well();
    let current = randomPiece();
    let nextPiece = randomPiece();

    let score = 0;
    let lines = 0;
    let level = 1;

    /** Seconds between automatic drops, and the time accrued towards one. */
    let dropInterval: number = DROP.base;
    let dropAccum = 0;

    let status: GameStatus = "ready";

    let rafId: number | null = null;
    let lastTime: number | null = null;
    let lastSnapshot: GameSnapshot | null = null;

    // ── Input ────────────────────────────────────────────────────────────────

    // Movement, rotation and soft drop act once per keydown, so holding a key
    // repeats at whatever cadence the browser's auto-repeat uses — exactly as
    // in the original, which has no repeat logic of its own. `held` exists only
    // to edge-trigger the space bar.
    const held = new Set<string>();

    function clearInput() {
        held.clear();
    }

    // ── Canvas scaling ───────────────────────────────────────────────────────

    // The world stays 800x600 in every branch of the code: only the backing
    // store grows with the device pixel ratio, and the transform hides it.
    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
        canvas.width = Math.round(WORLD.w * dpr);
        canvas.height = Math.round(WORLD.h * dpr);
        // Setting width/height resets the context, so the transform goes last.
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // ── Notifications ────────────────────────────────────────────────────────

    function setStatus(value: GameStatus) {
        if (status === value) return;
        status = value;
        on.status(value);
    }

    function emitSnapshot() {
        const snapshot: GameSnapshot = { score, lives: 0, level, lines };
        if (
            lastSnapshot !== null &&
            lastSnapshot.score === snapshot.score &&
            lastSnapshot.level === snapshot.level &&
            lastSnapshot.lines === snapshot.lines
        ) {
            return;
        }
        lastSnapshot = snapshot;
        on.snapshot(snapshot);
    }

    // ── Run setup ────────────────────────────────────────────────────────────

    function spawn() {
        current = nextPiece;
        nextPiece = randomPiece();
        // The one way a run ends by itself: there is no room for the piece that
        // just came in.
        if (well.collide(current.shape, current.x, current.y)) {
            setStatus("over");
        }
    }

    function initRun() {
        well.reset();
        score = 0;
        lines = 0;
        level = 1;
        dropInterval = DROP.base;
        dropAccum = 0;
        // Same two-step as init() in the original: one piece is drawn, then
        // spawn() promotes it and draws the one after it.
        nextPiece = randomPiece();
        spawn();
    }

    // ── Piece moves ──────────────────────────────────────────────────────────

    function move(dx: number) {
        if (!well.collide(current.shape, current.x + dx, current.y)) {
            current.x += dx;
        }
    }

    function tryRotate() {
        const rotated = current.rotateCW();
        // First offset that clears wins; if none does, the piece stays put.
        for (const kick of KICKS) {
            if (!well.collide(rotated, current.x + kick, current.y)) {
                current.shape = rotated;
                current.x += kick;
                return;
            }
        }
    }

    function lockPiece() {
        well.merge(current);
        const cleared = well.clearLines();
        if (cleared > 0) {
            lines += cleared;
            // The multiplier is the level before the clear, as in the original.
            score += (LINE_SCORES[cleared] ?? 0) * level;
            level = Math.floor(lines / LEVEL.linesPerLevel) + 1;
            dropInterval = Math.max(
                DROP.min,
                DROP.base - (level - 1) * DROP.step,
            );
        }
        spawn();
    }

    function softDrop() {
        if (!well.collide(current.shape, current.x, current.y + 1)) {
            current.y++;
            score += SCORE.softDropPerRow;
        } else {
            lockPiece();
        }
    }

    function hardDrop() {
        const landing = current.ghostY(well);
        score += (landing - current.y) * SCORE.hardDropPerCell;
        current.y = landing;
        lockPiece();
    }

    // ── Update ───────────────────────────────────────────────────────────────

    function update(dt: number) {
        // A hard drop can end the run from inside a key handler, and the frame
        // that was already queued still arrives. Without this guard it would
        // keep dropping a piece that has nowhere to go.
        if (status !== "playing") return;

        dropAccum += dt;
        if (dropAccum >= dropInterval) {
            dropAccum = 0;
            if (!well.collide(current.shape, current.x, current.y + 1)) {
                current.y++;
            } else {
                lockPiece();
            }
        }
    }

    // ── Draw ─────────────────────────────────────────────────────────────────

    function draw() {
        ctx.fillStyle = PALETTE.gutter;
        ctx.fillRect(0, 0, WORLD.w, WORLD.h);

        well.draw(ctx);
        // The landing shadow first, so the piece itself paints over it.
        current.draw(ctx, PALETTE.ghostAlpha, current.ghostY(well));
        current.draw(ctx);
        drawPreview(ctx, nextPiece);
    }

    // ── Loop ─────────────────────────────────────────────────────────────────

    function frame(ts: number) {
        const dt =
            lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
        lastTime = ts;

        update(dt);
        draw();
        emitSnapshot();

        // update() may have ended the run, in which case the loop stops here.
        rafId = status === "playing" ? requestAnimationFrame(frame) : null;
    }

    function startLoop() {
        if (rafId !== null) return;
        // The first dt of a loop is 0, so no time accumulated while paused ever
        // reaches the simulation and the piece never drops several rows at once.
        lastTime = null;
        rafId = requestAnimationFrame(frame);
    }

    function stopLoop() {
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = null;
        lastTime = null;
    }

    // ── Listeners ────────────────────────────────────────────────────────────

    function onKeyDown(event: KeyboardEvent) {
        // Only while playing: with the game paused or the end modal open the
        // keyboard must behave normally, so the initials field works.
        if (status === "playing" && GAME_KEYS.has(event.code)) {
            event.preventDefault();
        }

        if (event.code === "Space") {
            if (status === "ready") {
                handle.start();
            } else if (status === "playing" && !held.has(event.code)) {
                // Edge-triggered, the same pattern SPEC 05 used for shooting:
                // holding the bar down does not chain one hard drop per repeat.
                hardDrop();
            }
            held.add(event.code);
            return;
        }

        if (event.code === "KeyP" || event.code === "Escape") {
            if (status === "playing") handle.pause();
            else if (status === "paused") handle.resume();
            return;
        }

        if (status === "playing") {
            switch (event.code) {
                case "ArrowLeft":
                    move(-1);
                    break;
                case "ArrowRight":
                    move(1);
                    break;
                case "ArrowDown":
                    softDrop();
                    break;
                case "ArrowUp":
                case "KeyX":
                    tryRotate();
                    break;
            }
        }

        held.add(event.code);
    }

    function onKeyUp(event: KeyboardEvent) {
        held.delete(event.code);
    }

    function onVisibilityChange() {
        if (document.hidden) handle.pause();
    }

    function onResize() {
        resize();
        draw();
    }

    // ── Handle ───────────────────────────────────────────────────────────────

    const handle: EngineHandle = {
        start() {
            if (status !== "ready") return;
            setStatus("playing");
            startLoop();
        },

        pause() {
            if (status !== "playing") return;
            setStatus("paused");
            stopLoop();
            // A key held when the tab is hidden never sends its keyup, which
            // would leave the space bar looking held down on resume.
            clearInput();
        },

        resume() {
            if (status !== "paused") return;
            setStatus("playing");
            startLoop();
        },

        end() {
            if (status !== "playing" && status !== "paused") return;
            setStatus("over");
            stopLoop();
            clearInput();
            draw();
        },

        restart() {
            stopLoop();
            clearInput();
            initRun();
            setStatus("ready");
            lastSnapshot = null;
            emitSnapshot();
            draw();
        },

        destroy() {
            stopLoop();
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
            window.removeEventListener("resize", onResize);
            document.removeEventListener(
                "visibilitychange",
                onVisibilityChange,
            );
        },
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibilityChange);

    resize();
    handle.restart();

    return handle;
}
