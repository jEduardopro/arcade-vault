// The playfield of references/started-games/03-tetris/game.js, ported to
// TypeScript. The original has no classes: it has a module-global `board`
// matrix and a `current` object literal. Here they are two classes, under the
// same rule SPEC 05 set — draw(ctx) receives the context and nothing reads a
// global.
//
// Two deliberate differences from the entities of ASTEROIDES:
//
//   - No class has update(dt). Nothing in CAÍDA moves on its own: the only
//     effect of time is a drop accumulator that needs the current level, so it
//     belongs to the engine, not to the piece.
//   - Well.clearLines() returns how many rows went instead of scoring them.
//     The original scores inside clearLines() and calls updateHUD() from
//     there, which is exactly what the engine/React boundary forbids.
//
// The block face is copied from drawBlock() of the original. Only the colours
// change, and they come from PALETTE.

import {
    BLOCK_STYLE,
    type Cell,
    LINE_WIDTH,
    NEXT,
    PALETTE,
    PIECE_TYPES,
    PIECES,
    type PieceType,
    type Shape,
    WELL,
} from "@/app/lib/engines/caida/constants";

// Re-exported so the rest of the engine imports the piece types from here, as
// SPEC 07 section 3.3 describes. They are declared in constants.ts because
// PIECES needs them and that file imports nothing.
export type { Cell, PieceType, Shape };

// ── Utils ────────────────────────────────────────────────────────────────────

/** A fresh matrix of empty cells, WELL.rows by WELL.cols. */
function emptyCells(): Cell[][] {
    return Array.from({ length: WELL.rows }, () =>
        new Array<Cell>(WELL.cols).fill(0),
    );
}

/** A fresh, mutable copy of a piece's spawn shape. */
function shapeOf(type: PieceType): Shape {
    const shape = PIECES[type];
    if (!shape) throw new Error(`Unknown piece type: ${type}`);
    return shape.map((row) => [...row]);
}

/**
 * One block face at pixel coordinates: a 1px inset fill plus the highlight
 * strip on top. Empty cells draw nothing, so callers can pass them straight
 * from a matrix.
 */
function drawBlock(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    cell: Cell,
    size: number,
    alpha = 1,
) {
    const color = PALETTE.pieces[cell];
    if (!color) return;

    const { inset, highlightHeight } = BLOCK_STYLE;
    const side = size - inset * 2;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(px + inset, py + inset, side, side);
    ctx.fillStyle = PALETTE.highlight;
    ctx.fillRect(px + inset, py + inset, side, highlightHeight);
    ctx.globalAlpha = 1;
}

/** A frame drawn inside its own bounds, so the stroke never bleeds out. */
function strokeFrame(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
) {
    const half = LINE_WIDTH.frame / 2;
    ctx.strokeStyle = PALETTE.frame;
    ctx.lineWidth = LINE_WIDTH.frame;
    ctx.strokeRect(
        x + half,
        y + half,
        w - LINE_WIDTH.frame,
        h - LINE_WIDTH.frame,
    );
}

// ── Well ─────────────────────────────────────────────────────────────────────

/** The well: the matrix of locked cells, and its drawing. */
export class Well {
    cells: Cell[][] = emptyCells();

    reset() {
        this.cells = emptyCells();
    }

    /** True if `shape` placed at (ox, oy) leaves the well or hits a cell. */
    collide(shape: Shape, ox: number, oy: number): boolean {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (!shape[r][c]) continue;
                const nx = ox + c;
                const ny = oy + r;
                if (nx < 0 || nx >= WELL.cols || ny >= WELL.rows) return true;
                // Above the ceiling is not a collision: a spawning piece is
                // allowed to hang there, exactly as in the original.
                if (ny >= 0 && this.cells[ny][nx]) return true;
            }
        }
        return false;
    }

    /** Locks a piece into the matrix. */
    merge(piece: Piece) {
        for (let r = 0; r < piece.shape.length; r++) {
            for (let c = 0; c < piece.shape[r].length; c++) {
                const cell = piece.shape[r][c];
                if (cell) this.cells[piece.y + r][piece.x + c] = cell;
            }
        }
    }

    /** Removes every full row and returns how many went. */
    clearLines(): number {
        let cleared = 0;
        for (let r = WELL.rows - 1; r >= 0; r--) {
            if (this.cells[r].every((cell) => cell !== 0)) {
                this.cells.splice(r, 1);
                this.cells.unshift(new Array<Cell>(WELL.cols).fill(0));
                cleared++;
                r++; // re-check this index: everything shifted down one row
            }
        }
        return cleared;
    }

    draw(ctx: CanvasRenderingContext2D) {
        const width = WELL.cols * WELL.block;
        const height = WELL.rows * WELL.block;

        ctx.fillStyle = PALETTE.well;
        ctx.fillRect(WELL.x, WELL.y, width, height);

        ctx.strokeStyle = PALETTE.grid;
        ctx.lineWidth = LINE_WIDTH.grid;
        for (let c = 1; c < WELL.cols; c++) {
            const x = WELL.x + c * WELL.block;
            ctx.beginPath();
            ctx.moveTo(x, WELL.y);
            ctx.lineTo(x, WELL.y + height);
            ctx.stroke();
        }
        for (let r = 1; r < WELL.rows; r++) {
            const y = WELL.y + r * WELL.block;
            ctx.beginPath();
            ctx.moveTo(WELL.x, y);
            ctx.lineTo(WELL.x + width, y);
            ctx.stroke();
        }

        for (let r = 0; r < WELL.rows; r++) {
            for (let c = 0; c < WELL.cols; c++) {
                drawBlock(
                    ctx,
                    WELL.x + c * WELL.block,
                    WELL.y + r * WELL.block,
                    this.cells[r][c],
                    WELL.block,
                );
            }
        }

        strokeFrame(ctx, WELL.x, WELL.y, width, height);
    }
}

// ── Piece ────────────────────────────────────────────────────────────────────

/** The piece in play, and also the one shown in the preview. */
export class Piece {
    type: PieceType;
    shape: Shape;
    x: number;
    y = 0;

    constructor(type: PieceType) {
        this.type = type;
        this.shape = shapeOf(type);
        // Same spawn column as the original: centred on the shape's own width.
        this.x =
            Math.floor(WELL.cols / 2) - Math.floor(this.shape[0].length / 2);
    }

    /** Transpose + reverse. Returns a new matrix; the caller decides whether
     * it fits before adopting it. */
    rotateCW(): Shape {
        const rows = this.shape.length;
        const cols = this.shape[0].length;
        const result: Shape = Array.from({ length: cols }, () =>
            new Array<Cell>(rows).fill(0),
        );
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                result[c][rows - 1 - r] = this.shape[r][c];
            }
        }
        return result;
    }

    /** The row this piece would land on, projected straight down. */
    ghostY(well: Well): number {
        let gy = this.y;
        while (!well.collide(this.shape, this.x, gy + 1)) gy++;
        return gy;
    }

    /**
     * Draws the piece in well coordinates. `row` defaults to the piece's own
     * position; the landing shadow passes ghostY() and a lower alpha, which is
     * how the original draws it too.
     */
    draw(ctx: CanvasRenderingContext2D, alpha = 1, row = this.y) {
        for (let r = 0; r < this.shape.length; r++) {
            for (let c = 0; c < this.shape[r].length; c++) {
                drawBlock(
                    ctx,
                    WELL.x + (this.x + c) * WELL.block,
                    WELL.y + (row + r) * WELL.block,
                    this.shape[r][c],
                    WELL.block,
                    alpha,
                );
            }
        }
    }
}

// ── Spawning and preview ─────────────────────────────────────────────────────

/** Uniform random, exactly as in the original: no seven-bag. */
export function randomPiece(): Piece {
    const type = (Math.floor(Math.random() * PIECE_TYPES) + 1) as PieceType;
    return new Piece(type);
}

/**
 * The next piece, in its box in the right gutter. Not a HUD: no text is drawn,
 * only the same blocks the well uses, so the engine keeps rule 2 of the
 * boundary. The centring offsets are the ones drawNext() uses.
 */
export function drawPreview(ctx: CanvasRenderingContext2D, piece: Piece) {
    const side = NEXT.cells * NEXT.block;

    ctx.fillStyle = PALETTE.well;
    ctx.fillRect(NEXT.x, NEXT.y, side, side);

    const offX = Math.floor((NEXT.cells - piece.shape[0].length) / 2);
    const offY = Math.floor((NEXT.cells - piece.shape.length) / 2);
    for (let r = 0; r < piece.shape.length; r++) {
        for (let c = 0; c < piece.shape[r].length; c++) {
            drawBlock(
                ctx,
                NEXT.x + (offX + c) * NEXT.block,
                NEXT.y + (offY + r) * NEXT.block,
                piece.shape[r][c],
                NEXT.block,
            );
        }
    }

    strokeFrame(ctx, NEXT.x, NEXT.y, side, side);
}
