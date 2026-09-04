// The playfield of references/started-games/04-arkanoid/game.js, ported to
// TypeScript. The original has no classes: it has `paddle` and `ball` object
// literals and two module-global arrays. Here they are four classes, under the
// same rule SPEC 05 set — draw(ctx) receives the context and nothing reads a
// global.
//
// Three deliberate differences from the original, all three explained in
// section 6 of SPEC 08:
//
//   - Block.hits() returns the axis, not a boolean. The original flips vy
//     whatever face the ball came in through, so a ball arriving sideways at a
//     column of blocks bounces upwards.
//   - Ball.bounceOffPaddle() recomputes vx from the impact point. The original
//     only flips vy, so the ball's horizontal angle can never be changed and
//     the paddle is a wall instead of an instrument.
//   - Ball.stuck exists at all. It is the serve, which the original has no
//     notion of: it is a flag inside "playing", not a fifth GameStatus.
//
// The block face is the drawBlock() SPEC 07 ported for CAÍDA, stretched to the
// 64x24 of this game. Only the colours change, and they come from PALETTE.

import {
    BALL,
    BLOCK,
    BLOCK_STYLE,
    type BlockColor,
    type BlockSpec,
    BLOCKS_ORIGIN,
    EXPLOSION_DURATION,
    EXPLOSION_STYLE,
    GLOW,
    LEVELS,
    PADDLE,
    PALETTE,
    WORLD,
} from "@/app/lib/engines/bloque-buster/constants";

// Re-exported so the rest of the engine imports the block types from here, as
// SPEC 08 section 3.3 describes. They are declared in constants.ts because
// LEVELS needs them and that file imports nothing.
export type { BlockColor, BlockSpec };

// ── Utils ────────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/** Runs `paint` with a neon bloom in `color`, and always clears it again: an
 * unreset shadowBlur bleeds into every later draw of the frame. */
function withGlow(
    ctx: CanvasRenderingContext2D,
    color: string,
    blur: number,
    paint: () => void,
) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    paint();
    ctx.restore();
}

// ── Paddle ───────────────────────────────────────────────────────────────────

/** The paddle. It moves under the keyboard or under the mouse; which one is
 * the engine's business, not its own. */
export class Paddle {
    x = 0;
    readonly y = PADDLE.y;
    readonly w = PADDLE.w;
    readonly h = PADDLE.h;

    constructor() {
        this.centre();
    }

    /** The horizontal middle of the paddle, which is what the ball bounces
     * against. */
    get cx(): number {
        return this.x + this.w / 2;
    }

    /** Back to the middle of the world, as initPaddle() does. */
    centre() {
        this.x = (WORLD.w - this.w) / 2;
    }

    /** Keyboard: a signed pixel delta, already clamped to the world. */
    moveBy(dx: number) {
        this.x = clamp(this.x + dx, 0, WORLD.w - this.w);
    }

    /** Mouse: centres the paddle on a world x, clamped to the world. */
    moveTo(centreX: number) {
        this.x = clamp(centreX - this.w / 2, 0, WORLD.w - this.w);
    }

    draw(ctx: CanvasRenderingContext2D) {
        withGlow(ctx, PALETTE.paddle, GLOW.paddle, () => {
            ctx.fillStyle = PALETTE.paddle;
            ctx.fillRect(this.x, this.y, this.w, this.h);
        });
        ctx.fillStyle = PALETTE.highlight;
        ctx.fillRect(this.x, this.y, this.w, BLOCK_STYLE.highlightHeight);
    }
}

// ── Ball ─────────────────────────────────────────────────────────────────────

/** The ball. While `stuck` it is not integrated: it rides the paddle until the
 * player serves. */
export class Ball {
    x = 0;
    y = 0;
    vx = 0;
    vy = 0;
    stuck = true;

    readonly size = BALL.size;

    /** The magnitude of the velocity, which the paddle bounce preserves. */
    speed(): number {
        return Math.hypot(this.vx, this.vy);
    }

    /** Parks the ball centred on top of the paddle and stops it. */
    stickTo(paddle: Paddle) {
        this.stuck = true;
        this.vx = 0;
        this.vy = 0;
        this.x = paddle.cx - this.size / 2;
        this.y = paddle.y - this.size;
    }

    /** Serves, with the base direction of initBall() scaled by the level: up
     * and to the right. The real angle is settled on the first paddle bounce. */
    launch(multiplier: number) {
        this.stuck = false;
        this.vx = BALL.baseVx * multiplier;
        this.vy = BALL.baseVy * multiplier;
    }

    update(dt: number) {
        if (this.stuck) return;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    /**
     * Bounces off the paddle with the angle the impact point dictates: dead
     * centre goes straight up, the very edge goes out at BALL.maxBounceAngle.
     * The speed magnitude is preserved, and with a 60 degree cap the vertical
     * component never drops below half of it, so the ball cannot end up
     * rattling horizontally between the walls.
     */
    bounceOffPaddle(paddle: Paddle) {
        const offset = clamp(
            (this.x + this.size / 2 - paddle.cx) / (paddle.w / 2),
            -1,
            1,
        );
        const angle = offset * BALL.maxBounceAngle;
        const speed = this.speed();

        this.y = paddle.y - this.size;
        this.vx = speed * Math.sin(angle);
        this.vy = -speed * Math.cos(angle);
    }

    draw(ctx: CanvasRenderingContext2D) {
        const radius = this.size / 2;
        withGlow(ctx, PALETTE.ball, GLOW.ball, () => {
            ctx.fillStyle = PALETTE.ball;
            ctx.beginPath();
            ctx.arc(this.x + radius, this.y + radius, radius, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}

// ── Block ────────────────────────────────────────────────────────────────────

/** Which axis a collision came in through, or null for no collision. */
export type HitAxis = "x" | "y";

/** One block of the pattern. Killed with `alive = false` instead of being
 * spliced out of the array, exactly as in the original. */
export class Block {
    readonly x: number;
    readonly y: number;
    readonly w = BLOCK.w;
    readonly h = BLOCK.h;
    readonly color: BlockColor;
    alive = true;

    constructor(spec: BlockSpec) {
        this.x = BLOCKS_ORIGIN.x + spec.col * BLOCK.w;
        this.y = BLOCKS_ORIGIN.y + spec.row * BLOCK.h;
        this.color = spec.color;
    }

    /**
     * The AABB test of collideAABB(), plus which axis the ball entered
     * through: the one with the smaller overlap. Without that second half the
     * ball crosses a column of blocks sideways, which the fifth pattern makes
     * plain to see.
     */
    hits(ball: Ball): HitAxis | null {
        const overlapX =
            Math.min(ball.x + ball.size, this.x + this.w) -
            Math.max(ball.x, this.x);
        if (overlapX <= 0) return null;

        const overlapY =
            Math.min(ball.y + ball.size, this.y + this.h) -
            Math.max(ball.y, this.y);
        if (overlapY <= 0) return null;

        return overlapX < overlapY ? "x" : "y";
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (!this.alive) return;

        const color = PALETTE.blocks[this.color];
        const { inset, highlightHeight } = BLOCK_STYLE;
        const w = this.w - inset * 2;
        const h = this.h - inset * 2;

        withGlow(ctx, color, GLOW.block, () => {
            ctx.fillStyle = color;
            ctx.fillRect(this.x + inset, this.y + inset, w, h);
        });
        ctx.fillStyle = PALETTE.highlight;
        ctx.fillRect(this.x + inset, this.y + inset, w, highlightHeight);
    }
}

/** The blocks of one of the five patterns of levels.js. */
export function buildLevel(index: number): Block[] {
    return LEVELS[index].map((spec) => new Block(spec));
}

// ── Explosion ────────────────────────────────────────────────────────────────

/** The procedural flash that replaces the four spritesheet frames: the outline
 * of the block that just died, growing outwards as it fades. */
export class Explosion {
    private readonly x: number;
    private readonly y: number;
    private readonly w: number;
    private readonly h: number;
    private readonly color: string;

    elapsed = 0;

    constructor(block: Block) {
        this.x = block.x;
        this.y = block.y;
        this.w = block.w;
        this.h = block.h;
        this.color = PALETTE.blocks[block.color];
    }

    done(): boolean {
        return this.elapsed >= EXPLOSION_DURATION;
    }

    update(dt: number) {
        this.elapsed += dt;
    }

    draw(ctx: CanvasRenderingContext2D) {
        const t = Math.min(1, this.elapsed / EXPLOSION_DURATION);
        const scale = 1 + (EXPLOSION_STYLE.grow - 1) * t;
        const w = this.w * scale;
        const h = this.h * scale;
        const x = this.x + this.w / 2 - w / 2;
        const y = this.y + this.h / 2 - h / 2;

        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = GLOW.block;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = EXPLOSION_STYLE.lineWidth;
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
    }
}
