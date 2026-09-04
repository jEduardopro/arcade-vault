// The game loop and the border between the game and React.
//
// Four rules keep this module reusable by the next ported game:
//
//   1. It knows nothing about React, and nothing about the DOM beyond its own
//      canvas and the window it listens to for keys.
//   2. It draws no HUD and no overlays. drawHUD(), drawLifeIcon() and
//      drawOverlay() from game.js are gone: that information travels through
//      `snapshot` and React paints it.
//   3. `snapshot` is emitted only when a value actually changes, never once per
//      frame.
//   4. destroy() is part of the contract. Whoever creates an engine must call
//      it, or the loop and the listeners outlive the component.

import {
    MAX_DT,
    PALETTE,
    PARTICLE,
    POINTS,
    POWERUP,
    RUN,
    SHIP,
    WORLD,
} from "@/app/lib/engines/asteroides/constants";
import {
    Asteroid,
    Bullet,
    Particle,
    PowerUp,
    Ship,
    dist,
    rand,
    type Input,
} from "@/app/lib/engines/asteroides/entities";

/**
 * What the player sees the game doing.
 *
 *   ready   → the field is drawn but frozen, waiting for the start overlay
 *   playing ⇄ paused
 *   playing → over, either by losing the last life or through end()
 *
 * The two seconds between losing a life and respawning are NOT a status: for
 * React the game is still "playing", which is what the player perceives.
 */
export type GameStatus = "ready" | "playing" | "paused" | "over";

export type GameSnapshot = {
    score: number;
    lives: number;
    level: number;
    /** Seconds of triple shot left, one decimal. 0 when it is not active. */
    tripleShot: number;
};

export type EngineHandle = {
    /** "ready" → "playing". Ignored from any other status. */
    start(): void;
    pause(): void;
    resume(): void;
    /** Forced game over, from the FIN button. */
    end(): void;
    /** Back to "ready", with a fresh field drawn behind the start overlay. */
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
 * Backing-store cap. Past 2x the extra pixels buy nothing visible on vector
 * line art and cost real fill rate on a 60 fps loop.
 */
const MAX_DPR = 2;

export function createAsteroidsEngine(
    canvas: HTMLCanvasElement,
    on: EngineCallbacks,
): EngineHandle {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("2D canvas context unavailable");
    // Re-bound to a non-nullable const: the narrowing above does not survive
    // into the closures below.
    const ctx = context;

    // ── State ────────────────────────────────────────────────────────────────

    let ship = new Ship();
    let bullets: Bullet[] = [];
    let asteroids: Asteroid[] = [];
    let particles: Particle[] = [];
    let powerUps: PowerUp[] = [];

    let score = 0;
    let lives = RUN.lives;
    let level = 1;

    let status: GameStatus = "ready";
    /** The internal 'dead' phase of game.js: waiting to respawn. */
    let respawning = false;
    let deadTimer = 0;

    let powerUpSpawned = false;
    let killsSinceSpawn = 0;

    let rafId: number | null = null;
    let lastTime: number | null = null;
    let lastSnapshot: GameSnapshot | null = null;

    // ── Input ────────────────────────────────────────────────────────────────

    const held = new Set<string>();
    const input: Input = { left: false, right: false, thrust: false };
    /** Space is edge-triggered, like the justPressed table in game.js. */
    let shootQueued = false;

    function syncInput() {
        input.left = held.has("ArrowLeft");
        input.right = held.has("ArrowRight");
        input.thrust = held.has("ArrowUp");
    }

    function clearInput() {
        held.clear();
        shootQueued = false;
        syncInput();
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

    function setStatus(next: GameStatus) {
        if (status === next) return;
        status = next;
        on.status(next);
    }

    function emitSnapshot() {
        const next: GameSnapshot = {
            score,
            lives,
            level,
            tripleShot: Math.max(0, Math.round(ship.tripleShot * 10) / 10),
        };
        if (
            lastSnapshot !== null &&
            lastSnapshot.score === next.score &&
            lastSnapshot.lives === next.lives &&
            lastSnapshot.level === next.level &&
            lastSnapshot.tripleShot === next.tripleShot
        ) {
            return;
        }
        lastSnapshot = next;
        on.snapshot(next);
    }

    // ── Run setup ────────────────────────────────────────────────────────────

    function spawnAsteroids(count: number) {
        for (let i = 0; i < count; i++) {
            let x = 0;
            let y = 0;
            do {
                x = rand(0, WORLD.w);
                y = rand(0, WORLD.h);
            } while (
                Math.hypot(x - WORLD.w / 2, y - WORLD.h / 2) < RUN.safeDist
            );
            asteroids.push(new Asteroid(x, y, 3));
        }
    }

    function initRun() {
        ship = new Ship();
        bullets = [];
        asteroids = [];
        particles = [];
        powerUps = [];
        powerUpSpawned = false;
        killsSinceSpawn = 0;
        score = 0;
        lives = RUN.lives;
        level = 1;
        respawning = false;
        deadTimer = 0;
        spawnAsteroids(RUN.firstWave);
    }

    function nextLevel() {
        level++;
        bullets = [];
        particles = [];
        powerUps = [];
        powerUpSpawned = false;
        killsSinceSpawn = 0;
        ship.reset();
        spawnAsteroids(3 + level);
    }

    function explode(x: number, y: number, count: number) {
        for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
    }

    function killShip() {
        explode(ship.x, ship.y, PARTICLE.onShipDeath);
        ship.dead = true;
        lives--;
        if (lives <= 0) {
            setStatus("over");
        } else {
            respawning = true;
            deadTimer = RUN.deadTimer;
        }
    }

    // ── Update ───────────────────────────────────────────────────────────────

    function update(dt: number) {
        if (respawning) {
            deadTimer -= dt;
            particles.forEach((p) => p.update(dt));
            particles = particles.filter((p) => !p.dead);
            asteroids.forEach((a) => a.update(dt));
            if (deadTimer <= 0) {
                respawning = false;
                ship.reset();
            }
            return;
        }

        if (shootQueued) {
            shootQueued = false;
            bullets.push(...ship.tryShoot());
        }

        ship.update(dt, input);
        bullets.forEach((b) => b.update(dt));
        asteroids.forEach((a) => a.update(dt));
        particles.forEach((p) => p.update(dt));
        powerUps.forEach((p) => p.update(dt));

        bullets = bullets.filter((b) => !b.dead);
        particles = particles.filter((p) => !p.dead);
        powerUps = powerUps.filter((p) => !p.dead);

        for (const p of powerUps) {
            if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
                p.dead = true;
                ship.tripleShot = POWERUP.duration;
            }
        }

        // Bullet vs asteroid.
        const spawned: Asteroid[] = [];
        for (const b of bullets) {
            for (const a of asteroids) {
                if (a.dead || b.dead || dist(b, a) >= a.radius) continue;
                b.dead = true;
                a.dead = true;
                score += POINTS[a.size];
                explode(a.x, a.y, a.size * PARTICLE.perAsteroidSize);
                spawned.push(...a.split());
                if (!powerUpSpawned) {
                    killsSinceSpawn++;
                    const guaranteed =
                        killsSinceSpawn >= POWERUP.guaranteedAfterKills;
                    if (guaranteed || Math.random() < POWERUP.dropChance) {
                        powerUps.push(new PowerUp(a.x, a.y));
                        powerUpSpawned = true;
                    }
                }
            }
        }
        asteroids = asteroids.filter((a) => !a.dead).concat(spawned);
        bullets = bullets.filter((b) => !b.dead);

        // Ship vs asteroid.
        if (ship.invincible <= 0) {
            for (const a of asteroids) {
                if (dist(ship, a) < ship.radius + a.radius * SHIP.hitFudge) {
                    killShip();
                    break;
                }
            }
        }

        if (asteroids.length === 0) nextLevel();
    }

    // ── Draw ─────────────────────────────────────────────────────────────────

    function draw() {
        ctx.fillStyle = PALETTE.bg;
        ctx.fillRect(0, 0, WORLD.w, WORLD.h);

        particles.forEach((p) => p.draw(ctx));
        asteroids.forEach((a) => a.draw(ctx));
        powerUps.forEach((p) => p.draw(ctx));
        bullets.forEach((b) => b.draw(ctx));
        ship.draw(ctx);
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
        // reaches the simulation and the ship never jumps on resume.
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
                return;
            }
            // Edge-triggered: holding the key down does not auto-fire.
            if (status === "playing" && !held.has(event.code)) {
                shootQueued = true;
            }
        }

        if (event.code === "KeyP" || event.code === "Escape") {
            if (status === "playing") handle.pause();
            else if (status === "paused") handle.resume();
        }

        held.add(event.code);
        syncInput();
    }

    function onKeyUp(event: KeyboardEvent) {
        held.delete(event.code);
        syncInput();
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
            // reset() is what grants the three seconds of invincibility, so the
            // countdown starts when the player starts, not when the page loads.
            ship.reset();
            setStatus("playing");
            startLoop();
        },

        pause() {
            if (status !== "playing") return;
            setStatus("paused");
            stopLoop();
            // A key held when the tab is hidden never sends its keyup, which
            // would leave the ship thrusting forever on resume.
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
            // Visible in the frozen frame; start() grants the real invincibility.
            ship.invincible = 0;
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
