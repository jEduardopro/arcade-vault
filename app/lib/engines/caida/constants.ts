// Every tuning number of the game, copied from
// references/started-games/03-tetris/game.js without changing a single one.
// The original counts drop intervals in milliseconds; the engine loop has
// worked in seconds since SPEC 05, so DROP holds the same values divided by a
// thousand. Nothing else was rescaled.
//
// PIECES[8] of the original — the 3x3 nut ring — is deliberately not here:
// SPEC 07 ports the seven-tetromino game. See its section 6.

/**
 * Colour index of a cell: 0 is empty, 1-7 are the seven pieces.
 *
 * The type lives here and not in entities.ts because PIECES needs it and
 * constants.ts is the layer that imports nothing. entities.ts re-exports it,
 * so the rest of the engine keeps importing it from where SPEC 07 says.
 */
export type Cell = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** A piece kind: a Cell that is not the empty one. */
export type PieceType = Exclude<Cell, 0>;

/** One rotation state of a piece: a square matrix of colour indices. */
export type Shape = Cell[][];

/**
 * The world is a fixed 800x600 box, the same as ASTEROIDES, so it matches the
 * 4/3 of .crt-screen and needs no CSS of its own. The 300x600 well of the
 * original is drawn centred inside it; the gutters stay empty on purpose.
 */
export const WORLD = { w: 800, h: 600 } as const;

/** Frame delta cap, in seconds. Prevents a long tab blur from dropping a
 * piece several rows at once when the tab comes back. */
export const MAX_DT = 0.05;

export const WELL = {
    cols: 10,
    rows: 20,
    block: 30, // 10*30 = 300 wide, 20*30 = 600 tall
    x: 250, // (800 - 300) / 2
    y: 0, // 600 tall is the full height of the world
} as const;

/**
 * The next-piece preview, in the right gutter: four cells a side, the same as
 * the 120x120 second canvas of the original. Centred in the 250px gutter that
 * starts at x = 550, hence 550 + (250 - 120) / 2.
 */
export const NEXT = { x: 615, y: 60, cells: 4, block: 30 } as const;

/** Auto-drop interval, in seconds: max(min, base - (level - 1) * step).
 * game.js: max(100, 1000 - (level - 1) * 90) milliseconds. */
export const DROP = { base: 1, step: 0.09, min: 0.1 } as const;

export const LEVEL = { linesPerLevel: 10 } as const;

/** Points per line clear, indexed by how many rows went at once, then
 * multiplied by the current level. Index 0 is unused padding. */
export const LINE_SCORES = [0, 100, 300, 500, 800] as const;

export const SCORE = { hardDropPerCell: 2, softDropPerRow: 1 } as const;

/** Horizontal offsets tried, in order, when a rotation does not fit. The
 * first one that clears is taken; if none does, the piece stays put. */
export const KICKS = [0, -1, 1, -2, 2] as const;

/** How many piece kinds the bag has. randomPiece() rolls 1..PIECE_TYPES. */
export const PIECE_TYPES = 7;

/** Block face: a 1px inset all round and a 4px highlight strip on top. */
export const BLOCK_STYLE = { inset: 1, highlightHeight: 4 } as const;

/** Stroke widths: the grid is hairline, the frames are visible. */
export const LINE_WIDTH = { grid: 0.5, frame: 2 } as const;

/**
 * The seven shapes of game.js, each matrix filled with its own colour index.
 * Index 0 is null so a piece's type doubles as its index, exactly as in the
 * original.
 */
export const PIECES: readonly (readonly (readonly Cell[])[] | null)[] = [
    null,
    [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ], // I
    [
        [2, 2],
        [2, 2],
    ], // O
    [
        [0, 3, 0],
        [3, 3, 3],
        [0, 0, 0],
    ], // T
    [
        [0, 4, 4],
        [4, 4, 0],
        [0, 0, 0],
    ], // S
    [
        [5, 5, 0],
        [0, 5, 5],
        [0, 0, 0],
    ], // Z
    [
        [6, 0, 0],
        [6, 6, 6],
        [0, 0, 0],
    ], // J
    [
        [0, 0, 7],
        [7, 7, 7],
        [0, 0, 0],
    ], // L
];

// Mirror of the :root tokens in app/globals.css. The theme is dark-only and
// has had no light variant since SPEC 01, so these literals cannot drift on
// their own; the token each one copies is named beside it.
//
// The pastel palette of the original (#4dd0e1, #ba68c8, #e57373, ...) is gone:
// with the nut piece dropped there are exactly seven distinguishable accent
// tokens, one per piece and none repeated.
export const PALETTE = {
    gutter: "#0a0a0f", // --bg, the empty sides of the world
    well: "#0f0f18", // --bg-2, the floor of the well
    grid: "rgba(74, 79, 112, 0.35)", // --ink-faint with alpha, the grid lines
    frame: "rgba(0, 245, 255, 0.18)", // --line, the well and preview borders
    highlight: "rgba(255, 255, 255, 0.12)", // top strip of every block
    ghostAlpha: 0.2, // the landing shadow, as in the original
    // Indexed by Cell, so index 0 (empty) is unused padding.
    pieces: [
        null,
        "#00f5ff", // I -> --cyan
        "#f5ff00", // O -> --yellow
        "#ff006e", // T -> --magenta
        "#00ff88", // S -> --green
        "#d97a3a", // Z -> --bronze
        "#c7d0e0", // J -> --silver
        "#ffcf3a", // L -> --gold
    ],
} as const;
