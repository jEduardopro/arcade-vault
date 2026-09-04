// The game loop and the border between the game and React, for BLOQUE BUSTER.
//
// The same four rules SPEC 05 set, which are what keep this module reusable:
//
//   1. It knows nothing about React, and nothing about the page: it never
//      touches a node it did not make. This is the first engine of the Vault
//      that also listens to its own canvas, for the mouse, and the first that
//      owns audio elements, in sound.ts; destroy() releases both like any
//      window listener.
//   2. It draws no HUD and no overlays. The Score / Nivel / life pips of the
//      original draw(), its drawOverlay() for GAME OVER and for the victory
//      screen, and the whole drawPauseOverlay() with its five level buttons are
//      gone: that information travels through `snapshot` and `status`, and
//      React paints it. Not a single character of text is drawn inside the
//      canvas.
//   3. `snapshot` is emitted only when a value actually changes, never once per
//      frame. All four fields move on discrete events.
//   4. destroy() is part of the contract. Whoever creates an engine must call
//      it, or the loop and the listeners outlive the component.
//
// The internal state that never leaves this file: the explosions, the serve
// flag on the ball, and the speed multiplier of the current level.
//
// The original ends after level 5 with a "you finished the game" card. Here the
// run is endless: the patterns recycle and the speed keeps climbing to its
// ceiling, so the only way out is running out of lives. SPEC 08 section 6 says
// why.
//
// The two sound effects of the original are ported, in the same five places it
// plays them: the three walls, the paddle, and a block going. That makes this
// the only cartridge of the Vault that makes any noise.

import {
    BALL,
    LEVELS,
    MAX_DT,
    PADDLE,
    PALETTE,
    RUN,
    speedMultiplier,
    WORLD,
} from "@/app/lib/engines/bloque-buster/constants";
import {
    Ball,
    type Block,
    buildLevel,
    Explosion,
    Paddle,
} from "@/app/lib/engines/bloque-buster/entities";
import { createSounds } from "@/app/lib/engines/bloque-buster/sound";

/**
 * What the player sees the game doing.
 *
 *   ready   → the first pattern is drawn but frozen, waiting for the overlay
 *   playing ⇄ paused
 *   playing → over, either on the last life or through end()
 *
 * The serve is not one of these: it is a flag on the ball inside "playing".
 */
export type GameStatus = "ready" | "playing" | "paused" | "over";

export type GameSnapshot = {
    score: number;
    lives: number;
    /** 1, 2, 3… and it does not reset when a lap closes. */
    level: number;
    /** Blocks still standing in this level. The game-specific field here. */
    blocks: number;
};

export type EngineHandle = {
    /** "ready" → "playing". Ignored from any other status. */
    start(): void;
    pause(): void;
    resume(): void;
    /** Forced game over, from the FIN button. */
    end(): void;
    /** Back to "ready", with the first pattern drawn behind the start overlay. */
    restart(): void;
    /** Cancels the loop and removes every listener. Always call it. */
    destroy(): void;
};

export type EngineCallbacks = {
    snapshot: (snapshot: GameSnapshot) => void;
    status: (status: GameStatus) => void;
};

/** Keys the game owns: while playing, they must not scroll the page. */
const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight", "Space"]);

/**
 * Backing-store cap. Past 2x the extra pixels buy nothing visible and cost
 * real fill rate on a 60 fps loop.
 */
const MAX_DPR = 2;

export function createBloqueBusterEngine(
    canvas: HTMLCanvasElement,
    on: EngineCallbacks,
): EngineHandle {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("2D canvas context unavailable");
    // Re-bound to a non-nullable const: the narrowing above does not survive
    // into the closures below.
    const ctx = context;

    // ── State ────────────────────────────────────────────────────────────────

    const paddle = new Paddle();
    const ball = new Ball();
    const sounds = createSounds();
    let blocks: Block[] = [];
    let explosions: Explosion[] = [];

    let score = 0;
    // Annotated, or `as const` on RUN narrows this to the literal 3.
    let lives: number = RUN.lives;
    let level = 1;

    /** Blocks still alive, kept as a counter so no frame has to count them. */
    let blocksLeft = 0;
    /** Speed factor of the current level, applied when the ball is served. */
    let multiplier = 1;

    let status: GameStatus = "ready";

    let rafId: number | null = null;
    let lastTime: number | null = null;
    let lastSnapshot: GameSnapshot | null = null;

    // ── Input ────────────────────────────────────────────────────────────────

    // The paddle moves continuously while an arrow is down, so unlike CAÍDA the
    // held set is read by update() and not only used to edge-trigger the space
    // bar.
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
        const snapshot: GameSnapshot = {
            score,
            lives,
            level,
            blocks: blocksLeft,
        };
        if (
            lastSnapshot !== null &&
            lastSnapshot.score === snapshot.score &&
            lastSnapshot.lives === snapshot.lives &&
            lastSnapshot.level === snapshot.level &&
            lastSnapshot.blocks === snapshot.blocks
        ) {
            return;
        }
        lastSnapshot = snapshot;
        on.snapshot(snapshot);
    }

    // ── Run setup ────────────────────────────────────────────────────────────

    /**
     * Loads the pattern a level number maps to. Past the fifth the five recycle,
     * which is the whole of the endless loop; the speed keeps climbing until
     * speedMultiplier() caps it.
     */
    function loadLevel(n: number) {
        level = n;
        multiplier = speedMultiplier(n);
        blocks = buildLevel((n - 1) % LEVELS.length);
        blocksLeft = blocks.length;
        explosions = [];
        // The paddle keeps its place across levels, as in the original; only a
        // new run re-centres it.
        ball.stickTo(paddle);
    }

    function initRun() {
        score = 0;
        lives = RUN.lives;
        paddle.centre();
        loadLevel(1);
    }

    // ── Collisions ───────────────────────────────────────────────────────────

    /** The three walls of the original: left, right and top. The floor is not a
     * wall, it is where a life is lost. */
    function bounceOffWalls() {
        if (ball.x <= 0) {
            ball.x = 0;
            ball.vx = Math.abs(ball.vx);
            sounds.bounce();
        }
        if (ball.x + ball.size >= WORLD.w) {
            ball.x = WORLD.w - ball.size;
            ball.vx = -Math.abs(ball.vx);
            sounds.bounce();
        }
        if (ball.y <= 0) {
            ball.y = 0;
            ball.vy = Math.abs(ball.vy);
            sounds.bounce();
        }
    }

    /** The paddle test of the original, tolerance included; the angle it comes
     * out at is the entity's business. */
    function bounceOffPaddle() {
        const overlapsX =
            ball.x + ball.size > paddle.x && ball.x < paddle.x + paddle.w;
        const reachesTop = ball.y + ball.size >= paddle.y;
        const notPastIt =
            ball.y + ball.size <= paddle.y + paddle.h + BALL.paddleTolerance;

        if (ball.vy > 0 && overlapsX && reachesTop && notPastIt) {
            ball.bounceOffPaddle(paddle);
            sounds.bounce();
        }
    }

    /** One block per frame, with the break of the original: with dt capped at
     * MAX_DT the ball never overlaps two of them at once. */
    function breakBlocks() {
        for (const block of blocks) {
            if (!block.alive) continue;

            const axis = block.hits(ball);
            if (axis === null) continue;

            block.alive = false;
            blocksLeft--;
            explosions.push(new Explosion(block));
            score += RUN.pointsPerBlock;
            sounds.smash();

            if (axis === "x") ball.vx = -ball.vx;
            else ball.vy = -ball.vy;

            if (blocksLeft === 0) loadLevel(level + 1);
            return;
        }
    }

    /** The ball fell past the floor: one life, and the pattern stays as it was. */
    function loseLife() {
        if (ball.y <= WORLD.h) return;

        lives--;
        if (lives <= 0) {
            lives = 0;
            setStatus("over");
            return;
        }
        ball.stickTo(paddle);
    }

    // ── Update ───────────────────────────────────────────────────────────────

    function update(dt: number) {
        // A key handler can end the run between frames, and the frame that was
        // already queued still arrives.
        if (status !== "playing") return;

        if (held.has("ArrowLeft")) paddle.moveBy(-PADDLE.speed * dt);
        if (held.has("ArrowRight")) paddle.moveBy(PADDLE.speed * dt);

        if (ball.stuck) {
            // Waiting to be served: the ball rides the paddle wherever it goes.
            ball.stickTo(paddle);
        } else {
            ball.update(dt);
            bounceOffWalls();
            bounceOffPaddle();
            breakBlocks();
            loseLife();
        }

        for (const explosion of explosions) explosion.update(dt);
        explosions = explosions.filter((explosion) => !explosion.done());
    }

    // ── Draw ─────────────────────────────────────────────────────────────────

    function draw() {
        ctx.fillStyle = PALETTE.bg;
        ctx.fillRect(0, 0, WORLD.w, WORLD.h);

        for (const block of blocks) block.draw(ctx);
        for (const explosion of explosions) explosion.draw(ctx);
        paddle.draw(ctx);
        ball.draw(ctx);
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
        // reaches the simulation and the ball never teleports on resume.
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
            } else if (
                status === "playing" &&
                ball.stuck &&
                !held.has(event.code)
            ) {
                // Edge-triggered: holding the bar down must not re-serve.
                ball.launch(multiplier);
            }
            held.add(event.code);
            return;
        }

        if (event.code === "KeyP" || event.code === "Escape") {
            if (status === "playing") handle.pause();
            else if (status === "paused") handle.resume();
            return;
        }

        // The arrows only get recorded; update() is what moves the paddle, so
        // the speed is the same however fast the browser repeats a held key.
        held.add(event.code);
    }

    function onKeyUp(event: KeyboardEvent) {
        held.delete(event.code);
    }

    /**
     * The mouse, converted the way the original converts it: through the live
     * bounding box, because .game-canvas stretches the canvas over .crt-screen
     * and the factor changes with the window.
     */
    function onMouseMove(event: MouseEvent) {
        if (status !== "playing") return;

        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0) return;

        paddle.moveTo((event.clientX - rect.left) * (WORLD.w / rect.width));
        // So the ball follows the paddle between frames while it waits to be
        // served, instead of lagging one frame behind the pointer.
        if (ball.stuck) ball.stickTo(paddle);
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
            // would leave the paddle sliding on its own on resume.
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
            sounds.destroy();
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
            window.removeEventListener("resize", onResize);
            canvas.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener(
                "visibilitychange",
                onVisibilityChange,
            );
        },
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("resize", onResize);
    canvas.addEventListener("mousemove", onMouseMove);
    document.addEventListener("visibilitychange", onVisibilityChange);

    resize();
    handle.restart();

    return handle;
}
