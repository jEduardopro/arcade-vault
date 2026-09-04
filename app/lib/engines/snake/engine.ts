// The game loop and the border between the game and React, for SNAKE.
//
// The same four rules SPEC 05 set, which are what keep this module reusable:
//
//   1. It knows nothing about React, and nothing about the DOM beyond its own
//      canvas and the window it listens to for keys. Unlike BLOQUE BUSTER it
//      does not listen to the canvas either: this game has no mouse.
//   2. It draws no HUD and no overlays. Score, level and length travel through
//      `snapshot` and React paints them. Not a single character of text is
//      drawn inside the canvas.
//   3. `snapshot` is emitted only when a value actually changes, never once per
//      frame. Here all three move together and only when a fruit is eaten, so
//      at most once every 0.07 s.
//   4. destroy() is part of the contract. Whoever creates an engine must call
//      it, or the loop and the listeners outlive the component.
//
// The internal state that never leaves this file: stepAccum, fruits and the
// loading gate of the fruit sheet.

import {
    GRID,
    MAX_DT,
    RUN,
    SHEET,
    stepSeconds,
    WORLD,
} from "@/app/lib/engines/snake/constants";
import {
    type Cell,
    type Direction,
    drawGrid,
    Food,
    outsideGrid,
    sameCell,
    Snake,
} from "@/app/lib/engines/snake/entities";
import { createFruitSheet } from "@/app/lib/engines/snake/sprites";

/**
 * What the player sees the game doing.
 *
 *   ready   → the board is drawn but frozen, waiting for the start overlay
 *   playing ⇄ paused
 *   playing → over, by wall, by self-bite, by a full board or through end()
 */
export type GameStatus = "ready" | "playing" | "paused" | "over";

export type GameSnapshot = {
    score: number;
    /** Always 0: SNAKE has no lives, and PlayerShell renders "—" for it. */
    lives: number;
    level: number;
    /** Segments the snake is carrying. The game-specific field of this engine. */
    length: number;
};

export type EngineHandle = {
    /** "ready" → "playing". Ignored from any other status. */
    start(): void;
    pause(): void;
    resume(): void;
    /** Forced game over, from the FIN button. */
    end(): void;
    /** Back to "ready", with a fresh board drawn behind the start overlay. */
    restart(): void;
    /** Cancels the loop and removes every listener. Always call it. */
    destroy(): void;
};

export type EngineCallbacks = {
    snapshot: (snapshot: GameSnapshot) => void;
    status: (status: GameStatus) => void;
};

/** Which way each key turns. Arrows and WASD both work. */
const TURN_KEYS: Record<string, Direction> = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    KeyW: "up",
    KeyS: "down",
    KeyA: "left",
    KeyD: "right",
};

/** Keys the game owns: while playing, they must not scroll the page. */
const GAME_KEYS = new Set([...Object.keys(TURN_KEYS), "Space"]);

/**
 * Backing-store cap. Past 2x the extra pixels buy nothing visible and cost
 * real fill rate on a 60 fps loop.
 */
const MAX_DPR = 2;

export function createSnakeEngine(
    canvas: HTMLCanvasElement,
    on: EngineCallbacks,
): EngineHandle {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("2D canvas context unavailable");
    // Re-bound to a non-nullable const: the narrowing above does not survive
    // into the closures below.
    const ctx = context;

    // ── State ────────────────────────────────────────────────────────────────

    let snake = newSnake();
    const food = new Food();

    let score = 0;
    let fruits = 0;
    let level = 1;

    /** Time accrued towards the next step, in seconds. */
    let stepAccum = 0;

    let status: GameStatus = "ready";

    let rafId: number | null = null;
    let lastTime: number | null = null;
    let lastSnapshot: GameSnapshot | null = null;

    // ── The fruit sheet, and its gate ────────────────────────────────────────

    /** Set once the sheet resolves, loaded or failed. Until then a run cannot
     * begin: the first frame of a game about eating fruit should have fruit. */
    let sheetReady = false;
    /** A start() that arrived before the gate opened, replayed when it does, so
     * a player who is quick on the space bar does not have to press twice. */
    let startPending = false;
    /** False until this factory has finished wiring itself up. A sheet already
     * in the browser cache resolves synchronously, inside the initialiser of
     * `sheet` below, when neither `sheet` nor `handle` is assigned yet; the
     * restart() at the foot of this function is what draws that case. */
    let booted = false;

    const sheet = createFruitSheet(() => {
        sheetReady = true;
        if (!booted) return;
        // Repaint the frozen "ready" board, which drew the vector fallback.
        draw();
        if (startPending) {
            startPending = false;
            handle.start();
        }
    });

    // ── Input ────────────────────────────────────────────────────────────────

    function clearInput() {
        snake.clearTurns();
        // Time accrued before a pause must not buy a step on resume.
        stepAccum = 0;
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
        const snapshot: GameSnapshot = {
            score,
            lives: 0,
            level,
            length: snake.length,
        };
        if (
            lastSnapshot !== null &&
            lastSnapshot.score === snapshot.score &&
            lastSnapshot.level === snapshot.level &&
            lastSnapshot.length === snapshot.length
        ) {
            return;
        }
        lastSnapshot = snapshot;
        on.snapshot(snapshot);
    }

    // ── Run setup ────────────────────────────────────────────────────────────

    function newSnake() {
        // Centred and heading right, with its tail laid out behind it.
        const head: Cell = {
            col: Math.floor(GRID.cols / 2),
            row: Math.floor(GRID.rows / 2),
        };
        return new Snake(head, RUN.startLength, "right");
    }

    /** Every cell the snake is not on. Collected only when a fruit is placed,
     * which is what guarantees fruit never appears under the snake. */
    function freeCells(): Cell[] {
        const free: Cell[] = [];
        for (let col = 0; col < GRID.cols; col++) {
            for (let row = 0; row < GRID.rows; row++) {
                const cell = { col, row };
                if (!snake.covers(cell)) free.push(cell);
            }
        }
        return free;
    }

    function initRun() {
        snake = newSnake();
        score = 0;
        fruits = 0;
        level = 1;
        stepAccum = 0;
        food.respawn(freeCells(), Math.random, SHEET.count);
    }

    // ── The step ─────────────────────────────────────────────────────────────

    function gameOver() {
        setStatus("over");
        stopLoop();
        clearInput();
        draw();
    }

    function stepOnce() {
        const next = snake.nextCell();
        const grow = sameCell(next, food.cell);

        // Checked before moving, so a dead snake is never drawn through a wall
        // and the cell the tail frees on this very step stays legal.
        if (outsideGrid(next) || snake.hits(next, grow)) {
            gameOver();
            return;
        }

        snake.step(grow);
        if (!grow) return;

        // The fruit is worth the level it was eaten at, before the level moves.
        score += RUN.pointsPerFruit * level;
        fruits++;
        level = Math.min(
            RUN.maxLevel,
            Math.floor(fruits / RUN.fruitsPerLevel) + 1,
        );

        const free = freeCells();
        // No room left for a fruit means the board is full: a perfect run, and
        // still an ending. PlayerShell only knows "over".
        if (free.length === 0) {
            gameOver();
            return;
        }
        food.respawn(free, Math.random, SHEET.count);
    }

    // ── Update ───────────────────────────────────────────────────────────────

    function update(dt: number) {
        // A step can end the run, and the frame already queued still arrives.
        if (status !== "playing") return;

        stepAccum += dt;
        const interval = stepSeconds(level);
        while (stepAccum >= interval) {
            stepAccum -= interval;
            stepOnce();
            if (status !== "playing") return;
        }
    }

    // ── Draw ─────────────────────────────────────────────────────────────────

    function draw() {
        drawGrid(ctx);
        // Fruit first, so the head paints over it on the frame it is eaten.
        food.draw(ctx, sheet);
        snake.draw(ctx);
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
        // reaches the simulation and the snake never takes two steps at once.
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
        // keyboard must behave normally, so the initials field works and the
        // space bar types a space.
        if (status === "playing" && GAME_KEYS.has(event.code)) {
            event.preventDefault();
        }

        if (event.code === "KeyP" || event.code === "Escape") {
            if (status === "playing") handle.pause();
            else if (status === "paused") handle.resume();
            return;
        }

        const direction = TURN_KEYS[event.code];

        // The space bar starts a run, and so does the first direction key: in
        // this game that press is also a move, and losing it feels like a bug.
        if (status === "ready" && (event.code === "Space" || direction)) {
            handle.start();
        }

        if (status === "playing" && direction) snake.turn(direction);
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
            // The gate: without the sheet resolved there is nothing to eat yet.
            // The press is remembered rather than dropped.
            if (!sheetReady) {
                startPending = true;
                return;
            }
            setStatus("playing");
            startLoop();
        },

        pause() {
            if (status !== "playing") return;
            setStatus("paused");
            stopLoop();
            // A key held when the tab is hidden never sends its keyup, and a
            // turn queued before the pause is one the player has forgotten.
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
            initRun();
            setStatus("ready");
            startPending = false;
            lastSnapshot = null;
            emitSnapshot();
            draw();
        },

        destroy() {
            stopLoop();
            sheet.destroy();
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("resize", onResize);
            document.removeEventListener(
                "visibilitychange",
                onVisibilityChange,
            );
        },
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibilityChange);

    resize();
    handle.restart();
    booted = true;

    return handle;
}
