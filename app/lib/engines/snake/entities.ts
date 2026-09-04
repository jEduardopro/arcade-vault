// The pieces of the board: the snake, the fruit and the grid under both.
//
// Every draw() takes the context as a parameter and none of them writes a
// single character of text: the HUD belongs to PlayerShell, which is rule 2 of
// the engine contract of SPEC 05.

import { FOOD_DRAW, GRID, PALETTE, TURN_QUEUE_MAX } from "./constants";

// ── Grid coordinates ─────────────────────────────────────────────────────────

/** A square of the 20x15 board. Never a pixel: only draw() knows about those. */
export type Cell = { col: number; row: number };

export type Direction = "up" | "down" | "left" | "right";

/** One step in each direction, in cells. Row grows downwards, as on the canvas. */
const DELTA: Record<Direction, Cell> = {
    up: { col: 0, row: -1 },
    down: { col: 0, row: 1 },
    left: { col: -1, row: 0 },
    right: { col: 1, row: 0 },
};

/** What a 180 degree turn would be. Turning into it is refused, not fatal. */
const OPPOSITE: Record<Direction, Direction> = {
    up: "down",
    down: "up",
    left: "right",
    right: "left",
};

export function sameCell(a: Cell, b: Cell): boolean {
    return a.col === b.col && a.row === b.row;
}

/** True when the cell fell off the board. The four walls kill. */
export function outsideGrid(cell: Cell): boolean {
    return (
        cell.col < 0 ||
        cell.row < 0 ||
        cell.col >= GRID.cols ||
        cell.row >= GRID.rows
    );
}

// ── Utils ────────────────────────────────────────────────────────────────────

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

/** Top-left pixel of a cell. */
function originOf(cell: Cell): { x: number; y: number } {
    return { x: cell.col * GRID.cell, y: cell.row * GRID.cell };
}

// ── The board ────────────────────────────────────────────────────────────────

/** The floor and its lines. Drawn first, every frame, and nothing else clears
 * the canvas: this fill is what wipes the previous one. */
export function drawGrid(ctx: CanvasRenderingContext2D): void {
    const w = GRID.cols * GRID.cell;
    const h = GRID.rows * GRID.cell;

    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = PALETTE.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Half-pixel offsets, or a 1 px line straddles two rows of pixels and blurs.
    for (let col = 1; col < GRID.cols; col++) {
        ctx.moveTo(col * GRID.cell + 0.5, 0);
        ctx.lineTo(col * GRID.cell + 0.5, h);
    }
    for (let row = 1; row < GRID.rows; row++) {
        ctx.moveTo(0, row * GRID.cell + 0.5);
        ctx.lineTo(w, row * GRID.cell + 0.5);
    }
    ctx.stroke();
}

// ── The snake ────────────────────────────────────────────────────────────────

/**
 * The snake. It owns its body, its heading and the turns queued for the steps
 * to come; whether a step is fatal is the engine's decision, not its own.
 *
 * The head is always segments[0].
 */
export class Snake {
    readonly segments: Cell[] = [];
    direction: Direction = "right";
    /** Turns waiting for a step, oldest first. At most TURN_QUEUE_MAX. */
    private readonly pendingTurns: Direction[] = [];

    constructor(head: Cell, length: number, direction: Direction = "right") {
        this.direction = direction;
        // Laid out behind the head, so the first step does not run over itself.
        const back = DELTA[OPPOSITE[direction]];
        for (let i = 0; i < length; i++) {
            this.segments.push({
                col: head.col + back.col * i,
                row: head.row + back.row * i,
            });
        }
    }

    get length(): number {
        return this.segments.length;
    }

    /**
     * Queues a turn. A 180 degree turn and a repeat of the heading are dropped:
     * biting your own neck is an input mistake, not a decision, and neither is
     * worth spending a slot of the queue on.
     */
    turn(direction: Direction): void {
        if (this.pendingTurns.length >= TURN_QUEUE_MAX) return;
        const last = this.pendingTurns.at(-1) ?? this.direction;
        if (direction === last || direction === OPPOSITE[last]) return;
        this.pendingTurns.push(direction);
    }

    /** Drops every queued turn. The engine calls it on pause, so coming back
     * from another tab does not spend a turn the player has forgotten about. */
    clearTurns(): void {
        this.pendingTurns.length = 0;
    }

    /** Where the head lands on the next step. Peeks the queue, changes nothing,
     * and is what lets the engine decide about a cell before moving into it. */
    nextCell(): Cell {
        return this.headAfterTurn().cell;
    }

    /**
     * Advances one cell: takes the oldest queued turn, puts the new head in
     * front and, unless it is growing, drops the tail. Returns the new head.
     */
    step(grow: boolean): Cell {
        const { cell, direction } = this.headAfterTurn();
        this.pendingTurns.shift();
        this.direction = direction;
        this.segments.unshift(cell);
        if (!grow) this.segments.pop();
        return cell;
    }

    /**
     * Whether `cell` is part of the body. Called before step(), so with `grow`
     * false the tail is ignored: that cell is freed on this very step and
     * moving into it is legal.
     */
    hits(cell: Cell, grow: boolean): boolean {
        const end = grow ? this.segments.length : this.segments.length - 1;
        for (let i = 0; i < end; i++) {
            if (sameCell(this.segments[i], cell)) return true;
        }
        return false;
    }

    /** True when the cell is under any segment. Used to keep fruit off the snake. */
    covers(cell: Cell): boolean {
        return this.segments.some((segment) => sameCell(segment, cell));
    }

    draw(ctx: CanvasRenderingContext2D): void {
        // Back to front, so the head ends up painted over its neighbour.
        for (let i = this.segments.length - 1; i > 0; i--) {
            this.paintSegment(ctx, this.segments[i], PALETTE.body, 0);
        }
        this.paintSegment(ctx, this.segments[0], PALETTE.head, 12);
    }

    private headAfterTurn(): { cell: Cell; direction: Direction } {
        const direction = this.pendingTurns[0] ?? this.direction;
        const delta = DELTA[direction];
        const head = this.segments[0];
        return {
            cell: { col: head.col + delta.col, row: head.row + delta.row },
            direction,
        };
    }

    private paintSegment(
        ctx: CanvasRenderingContext2D,
        cell: Cell,
        color: string,
        blur: number,
    ): void {
        const { x, y } = originOf(cell);
        const inset = 3;
        const size = GRID.cell - inset * 2;
        const paint = () => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.roundRect(x + inset, y + inset, size, size, 6);
            ctx.fill();
        };
        if (blur > 0) withGlow(ctx, color, blur, paint);
        else paint();
    }
}

// ── The fruit ────────────────────────────────────────────────────────────────

/**
 * What Food needs in order to paint itself. sprites.ts's FruitSheet satisfies
 * it structurally, so this file never has to know that an image exists.
 */
export type FoodPainter = {
    draw(
        ctx: CanvasRenderingContext2D,
        slot: number,
        cx: number,
        cy: number,
    ): void;
};

/** The fruit on the board: a cell and which of the six sprites it wears. */
export class Food {
    cell: Cell = { col: 0, row: 0 };
    slot = 0;

    /**
     * Moves to one of the free cells and draws a new fruit. The engine passes
     * the free cells already collected, which is what guarantees the fruit
     * never appears under the snake.
     */
    respawn(free: Cell[], rng: () => number, slots: number): void {
        if (free.length === 0) return;
        this.cell = free[Math.floor(rng() * free.length)];
        this.slot = Math.floor(rng() * slots);
    }

    draw(ctx: CanvasRenderingContext2D, painter: FoodPainter): void {
        const { x, y } = originOf(this.cell);
        const cx = x + GRID.cell / 2;
        const cy = y + GRID.cell / 2;

        // The magenta halo, which is also what the cover-snake art draws.
        const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, GRID.cell / 2);
        halo.addColorStop(0, "rgba(255, 0, 110, 0.35)");
        halo.addColorStop(1, "rgba(255, 0, 110, 0)");
        ctx.fillStyle = halo;
        ctx.fillRect(x, y, GRID.cell, GRID.cell);

        painter.draw(ctx, this.slot, cx, cy);
    }
}

/** The destination box of a fruit sprite, centred on a cell. Shared by the
 * sheet and by its vector fallback so both land in exactly the same place. */
export function foodBox(cx: number, cy: number) {
    return {
        x: cx - FOOD_DRAW.w / 2,
        y: cy - FOOD_DRAW.h / 2,
        w: FOOD_DRAW.w,
        h: FOOD_DRAW.h,
    };
}
