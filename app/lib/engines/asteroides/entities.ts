// The five entities of references/started-games/02-asteroids/game.js, ported to
// TypeScript. Three mechanical changes and no behavioural ones:
//
//   - draw(ctx, palette) receives the canvas context instead of reading a
//     module global, and since SPEC 10 the palette too: an entity does not look
//     its colours up, they are handed to it, exactly as ctx already was.
//   - Ship.update(dt, input) receives the keyboard state instead of reading a
//     module-level `keys` object.
//
// Everything else — the silhouettes, the vertex counts, the blink cadence — is
// copied vertex by vertex. Only the colours change, and they come from the
// palette of whichever skin the player picked; `clasico` is a byte-for-byte
// copy of PALETTE, so the default still paints what the original did.

import {
    ASTEROID,
    BULLET,
    PARTICLE,
    POWERUP,
    RADII,
    SHIP,
    SPEEDS,
    WORLD,
} from "@/app/lib/engines/asteroides/constants";
import type { Palette } from "@/app/lib/engines/asteroides/skins";

// ── Utils ────────────────────────────────────────────────────────────────────

/** Toroidal wrap: leaving one edge brings you back through the opposite one. */
const wrap = (v: number, max: number) => ((v % max) + max) % max;

const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

export const rand = (min: number, max: number) =>
    min + Math.random() * (max - min);

export const dist = (
    a: { x: number; y: number },
    b: { x: number; y: number },
) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * The bloom of a skin. Assigns both fields every time so a previous drawable's
 * halo can never leak into this one: a radius of 0 — every value of `clasico` —
 * disables the shadow whatever the colour is. Every caller sets it inside its
 * own save()/restore() pair, so the frame clear never inherits a shadow.
 */
function setGlow(ctx: CanvasRenderingContext2D, radius: number, color: string) {
    ctx.shadowBlur = radius;
    ctx.shadowColor = color;
}

// ── Types ────────────────────────────────────────────────────────────────────

/** Held keys, read by the ship. The engine owns the listeners. */
export type Input = { left: boolean; right: boolean; thrust: boolean };

/** 1 small, 2 medium, 3 large. Indexes RADII, SPEEDS and POINTS. */
export type AsteroidSize = 1 | 2 | 3;

// ── Bullet ───────────────────────────────────────────────────────────────────

export class Bullet {
    x: number;
    y: number;
    vx: number;
    vy: number;
    ttl: number = BULLET.ttl;
    radius: number = BULLET.radius;
    dead = false;

    constructor(x: number, y: number, angle: number) {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * BULLET.speed;
        this.vy = Math.sin(angle) * BULLET.speed;
    }

    update(dt: number) {
        this.x = wrap(this.x + this.vx * dt, WORLD.w);
        this.y = wrap(this.y + this.vy * dt, WORLD.h);
        this.ttl -= dt;
        if (this.ttl <= 0) this.dead = true;
    }

    draw(ctx: CanvasRenderingContext2D, palette: Palette) {
        ctx.save();
        setGlow(ctx, palette.glow.bullet, palette.bullet);
        ctx.fillStyle = palette.bullet;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ── Asteroid ─────────────────────────────────────────────────────────────────

export class Asteroid {
    x: number;
    y: number;
    size: AsteroidSize;
    radius: number;
    vx: number;
    vy: number;
    rot: number;
    rotSpeed: number;
    /** Irregular polygon, in asteroid space. */
    verts: Array<[number, number]> = [];
    dead = false;

    constructor(x: number, y: number, size: AsteroidSize = 3) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.radius = RADII[size];

        const angle = rand(0, Math.PI * 2);
        const speed =
            SPEEDS[size] + rand(-ASTEROID.speedJitter, ASTEROID.speedJitter);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.rotSpeed = rand(-ASTEROID.rotSpeed, ASTEROID.rotSpeed);
        this.rot = rand(0, Math.PI * 2);

        const n = randInt(ASTEROID.minVerts, ASTEROID.maxVerts);
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            const r =
                this.radius *
                rand(ASTEROID.minRadiusFactor, ASTEROID.maxRadiusFactor);
            this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
        }
    }

    update(dt: number) {
        this.x = wrap(this.x + this.vx * dt, WORLD.w);
        this.y = wrap(this.y + this.vy * dt, WORLD.h);
        this.rot += this.rotSpeed * dt;
    }

    /** Two fragments one size down. Small asteroids do not split. */
    split(): Asteroid[] {
        if (this.size <= 1) return [];
        const next = (this.size - 1) as AsteroidSize;
        return [
            new Asteroid(this.x, this.y, next),
            new Asteroid(this.x, this.y, next),
        ];
    }

    draw(ctx: CanvasRenderingContext2D, palette: Palette) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        setGlow(ctx, palette.glow.asteroid, palette.asteroid);
        ctx.strokeStyle = palette.asteroid;
        ctx.lineWidth = 1.5;
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(this.verts[0][0], this.verts[0][1]);
        for (let i = 1; i < this.verts.length; i++) {
            ctx.lineTo(this.verts[i][0], this.verts[i][1]);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }
}

// ── PowerUp ──────────────────────────────────────────────────────────────────

export class PowerUp {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number = POWERUP.radius;
    ttl: number = POWERUP.ttl;
    dead = false;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        const angle = rand(0, Math.PI * 2);
        const speed = rand(POWERUP.minSpeed, POWERUP.maxSpeed);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
    }

    update(dt: number) {
        this.x = wrap(this.x + this.vx * dt, WORLD.w);
        this.y = wrap(this.y + this.vy * dt, WORLD.h);
        this.ttl -= dt;
        if (this.ttl <= 0) this.dead = true;
    }

    draw(ctx: CanvasRenderingContext2D, palette: Palette) {
        // About to expire: blink instead of vanishing without warning.
        if (
            this.ttl < POWERUP.blinkBelow &&
            Math.floor(this.ttl * 8) % 2 === 0
        ) {
            return;
        }

        const pulse = 0.85 + Math.sin(performance.now() / 150) * 0.15;
        // The "3x" caption is drawn in world space, outside the rotation, so
        // this save() wraps the whole method instead of just the square: the
        // glow has to cover both and neither may leak out.
        ctx.save();
        setGlow(ctx, palette.glow.powerUp, palette.powerUp);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.PI / 4);
        ctx.strokeStyle = palette.powerUp;
        ctx.lineWidth = 2;
        const r = this.radius * pulse;
        ctx.strokeRect(-r, -r, r * 2, r * 2);
        ctx.restore();

        ctx.fillStyle = palette.powerUp;
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("3x", this.x, this.y);
        ctx.restore();
    }
}

// ── Ship ─────────────────────────────────────────────────────────────────────

export class Ship {
    x = WORLD.w / 2;
    y = WORLD.h / 2;
    angle = -Math.PI / 2;
    vx = 0;
    vy = 0;
    radius: number = SHIP.radius;
    thrusting = false;
    invincible: number = SHIP.invincible;
    shootCooldown = 0;
    dead = false;
    /**
     * Seconds of triple shot left. Declared outside reset() on purpose: in the
     * original the power-up survives a death and a level change, and only the
     * constructor clears it.
     */
    tripleShot = 0;

    /** Back to the centre, still, facing up, with respawn invincibility. */
    reset() {
        this.x = WORLD.w / 2;
        this.y = WORLD.h / 2;
        this.angle = -Math.PI / 2;
        this.vx = 0;
        this.vy = 0;
        this.thrusting = false;
        this.invincible = SHIP.invincible;
        this.shootCooldown = 0;
        this.dead = false;
    }

    update(dt: number, input: Input) {
        if (this.dead) return;
        if (this.invincible > 0) this.invincible -= dt;
        if (this.shootCooldown > 0) this.shootCooldown -= dt;
        if (this.tripleShot > 0) this.tripleShot -= dt;

        if (input.left) this.angle -= SHIP.rot * dt;
        if (input.right) this.angle += SHIP.rot * dt;

        this.thrusting = input.thrust;
        if (this.thrusting) {
            this.vx += Math.cos(this.angle) * SHIP.thrust * dt;
            this.vy += Math.sin(this.angle) * SHIP.thrust * dt;
        }

        this.vx *= SHIP.drag;
        this.vy *= SHIP.drag;
        this.x = wrap(this.x + this.vx * dt, WORLD.w);
        this.y = wrap(this.y + this.vy * dt, WORLD.h);
    }

    /** One bullet, or three spread ones while the power-up lasts. */
    tryShoot(): Bullet[] {
        if (this.shootCooldown > 0 || this.dead) return [];
        this.shootCooldown = SHIP.cooldown;

        const ox = this.x + Math.cos(this.angle) * SHIP.nose;
        const oy = this.y + Math.sin(this.angle) * SHIP.nose;

        if (this.tripleShot > 0) {
            const spread = POWERUP.tripleSpread;
            return [
                new Bullet(ox, oy, this.angle - spread),
                new Bullet(ox, oy, this.angle),
                new Bullet(ox, oy, this.angle + spread),
            ];
        }
        return [new Bullet(ox, oy, this.angle)];
    }

    draw(ctx: CanvasRenderingContext2D, palette: Palette) {
        if (this.dead) return;
        // Blink while the respawn invincibility lasts.
        if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) {
            return;
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        setGlow(ctx, palette.glow.ship, palette.ship);
        ctx.strokeStyle = palette.ship;
        ctx.lineWidth = 1.5;
        ctx.lineJoin = "round";

        // Classic silhouette: a triangle with a notch at the back.
        ctx.beginPath();
        ctx.moveTo(SHIP.hull[0][0], SHIP.hull[0][1]);
        for (let i = 1; i < SHIP.hull.length; i++) {
            ctx.lineTo(SHIP.hull[i][0], SHIP.hull[i][1]);
        }
        ctx.closePath();
        ctx.stroke();

        // Thruster flame, skipped on some frames so it flickers.
        const { x, y, minLength, maxLength, skipChance } = SHIP.flame;
        if (this.thrusting && Math.random() > skipChance) {
            // Its own glow, reassigned over the hull's: the exhaust burns at a
            // different radius than the hull in every skin.
            setGlow(ctx, palette.glow.flame, palette.flame);
            ctx.beginPath();
            ctx.moveTo(x, -y);
            ctx.lineTo(x - rand(minLength, maxLength), 0);
            ctx.lineTo(x, y);
            ctx.strokeStyle = palette.flame;
            ctx.stroke();
        }

        ctx.restore();
    }
}

// ── Particle ─────────────────────────────────────────────────────────────────

export class Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    ttl: number;
    dead = false;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        const angle = rand(0, Math.PI * 2);
        const speed = rand(PARTICLE.minSpeed, PARTICLE.maxSpeed);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = rand(PARTICLE.minLife, PARTICLE.maxLife);
        this.ttl = this.life;
    }

    /** Debris does not wrap: it flies off and fades out where it is. */
    update(dt: number) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.ttl -= dt;
        if (this.ttl <= 0) this.dead = true;
    }

    draw(ctx: CanvasRenderingContext2D, palette: Palette) {
        const alpha = this.ttl / this.life;
        const color = `rgba(${palette.particle}, ${alpha.toFixed(2)})`;
        ctx.save();
        setGlow(ctx, palette.glow.particle, color);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
        ctx.stroke();
        ctx.restore();
    }
}
