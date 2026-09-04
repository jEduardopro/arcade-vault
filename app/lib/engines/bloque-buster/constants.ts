// Every tuning number of the game, copied from
// references/started-games/04-arkanoid/game.js and levels.js without changing
// a single one. The only value that is not in the original is MAX_DT, and it
// is derived from the others right where it is declared.
//
// Two things the original has and this file deliberately does not: the
// spritesheet the blocks, the paddle and the ball were drawn from, and the two
// sound effects. SPEC 08 ports the game vectorially and silently; see its
// section 6.

/**
 * The seven colour names of the original. They are the names, not the colours:
 * PALETTE.blocks maps each one to a :root token, so `red` paints bronze.
 *
 * The type lives here and not in entities.ts because LEVELS needs it and
 * constants.ts is the layer that imports nothing. entities.ts re-exports it,
 * so the rest of the engine keeps importing it from where SPEC 08 says.
 */
export type BlockColor =
    "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray";

/** One block of a level pattern, in grid coordinates. */
export type BlockSpec = { col: number; row: number; color: BlockColor };

/** The world is a fixed 800x600 box, which is already the 4/3 of .crt-screen,
 * so .game-canvas of SPEC 05 covers it and this game needs no CSS. */
export const WORLD = { w: 800, h: 600 } as const;

/**
 * Frame delta cap, in seconds. Tighter than the 0.05 of the other two engines,
 * and this is the one number of the port that is not in the original: at the
 * ×2 speed ceiling the ball travels 721 px/s, so 721 * 0.02 = 14.4 px per
 * tick, less than its own 16 px diameter. With 0.05 it would jump 36 px and
 * could cross a whole row of blocks on the way back from another tab.
 */
export const MAX_DT = 0.02;

export const PADDLE = {
    w: 81, // the `w` of the paddle object in game.js, not the 162 px sprite
    h: 14,
    y: 560,
    speed: 400, // px/s under the arrow keys; PADDLE_SPEED
} as const;

export const BALL = {
    size: 16,
    baseVx: 200, // BASE_BALL_VX
    baseVy: -300, // BASE_BALL_VY
    speedStep: 1.1, // x1.1 per level: the 1.00/1.10/1.21/1.33/1.46 of levels.js
    maxMultiplier: 2, // speed ceiling, reached on level 9
    maxBounceAngle: (60 * Math.PI) / 180, // off the very edge of the paddle
    paddleTolerance: 8, // the 8 px margin game.js allows under the paddle
} as const;

export const BLOCK = { cols: 10, rows: 6, w: 64, h: 24 } as const;

/** BLOCKS_ORIGIN_X = (800 - 10 * 64) / 2, BLOCKS_ORIGIN_Y as in the original. */
export const BLOCKS_ORIGIN = { x: 80, y: 80 } as const;

export const RUN = { lives: 3, pointsPerBlock: 10 } as const;

/** The 150 ms of EXPLOSION_DURATION, in seconds. */
export const EXPLOSION_DURATION = 0.15;

/** The procedural flash that replaces the four spritesheet frames: a rectangle
 * that grows past the block it came from while it fades out. */
export const EXPLOSION_STYLE = { grow: 1.6, lineWidth: 2 } as const;

/** Block face: a 1px inset all round and a 4px highlight strip on top. The
 * same drawing SPEC 07 ported for CAÍDA. */
export const BLOCK_STYLE = { inset: 1, highlightHeight: 4 } as const;

/** Neon bloom, in px of shadowBlur. What makes the vector shapes read as
 * arcade without a single pixel of image. */
export const GLOW = { paddle: 14, ball: 10, block: 6 } as const;

/**
 * The two effects of the original, copied byte for byte into public/. They are
 * the only binary assets any cartridge of the Vault loads.
 *
 * `volume` is the one number here the original does not have: it plays both at
 * full blast, which is a lot inside a page. `voices` is how many copies of each
 * effect stay ready, so overlapping hits do not cut each other off.
 */
export const SOUNDS = {
    bounce: "/games/bloque-buster/ball-bounce.mp3",
    smash: "/games/bloque-buster/break-sound.mp3",
    volume: 0.35,
    voices: 4,
} as const;

/**
 * The speed multiplier of a level, extended past the fifth.
 *
 * The five literals of levels.js (1.00, 1.10, 1.21, 1.33, 1.46) are exactly
 * this power rounded to two decimals, so the formula reproduces the original
 * and carries it into the endless loop without inventing a value. The ceiling
 * lands on level 9, and from there only the pattern changes.
 */
export function speedMultiplier(level: number): number {
    return Math.min(BALL.maxMultiplier, BALL.speedStep ** (level - 1));
}

/**
 * The five patterns of levels.js, built with the very same loops: full grid,
 * centred pyramid, checkerboard, rows with gaps, and frame plus central cross.
 * The engine recycles them with LEVELS[(level - 1) % LEVELS.length], which is
 * what turns a five-level game into an endless one.
 *
 * Block counts, worth checking after any edit: 60, 40, 30, 39 and 39, or 208
 * per full lap.
 */
export const LEVELS: readonly (readonly BlockSpec[])[] = (() => {
    const rowColors1: BlockColor[] = [
        "red",
        "yellow",
        "cyan",
        "magenta",
        "hotpink",
        "green",
    ];
    const rowColors2: BlockColor[] = [
        "gray",
        "cyan",
        "hotpink",
        "yellow",
        "magenta",
        "green",
    ];
    const rowColors4: BlockColor[] = [
        "cyan",
        "magenta",
        "green",
        "yellow",
        "hotpink",
        "red",
    ];

    // 1 — the full 10x6 grid, one colour per row.
    const l1: BlockSpec[] = [];
    for (let row = 0; row < BLOCK.rows; row++) {
        for (let col = 0; col < BLOCK.cols; col++) {
            l1.push({ col, row, color: rowColors1[row] });
        }
    }

    // 2 — a pyramid: each row spans from pyStart[row] to pyEnd[row].
    const pyStart = [4, 3, 2, 1, 0, 0];
    const pyEnd = [5, 6, 7, 8, 9, 9];
    const l2: BlockSpec[] = [];
    for (let row = 0; row < BLOCK.rows; row++) {
        for (let col = pyStart[row]; col <= pyEnd[row]; col++) {
            l2.push({ col, row, color: rowColors2[row] });
        }
    }

    // 3 — a checkerboard, yellow on top and magenta below.
    const l3: BlockSpec[] = [];
    for (let row = 0; row < BLOCK.rows; row++) {
        for (let col = 0; col < BLOCK.cols; col++) {
            if ((col + row) % 2 === 0) {
                l3.push({ col, row, color: row < 3 ? "yellow" : "magenta" });
            }
        }
    }

    // 4 — full rows minus the gaps of gaps4.
    const gaps4 = [
        [2, 5, 8],
        [0, 4, 7, 9],
        [1, 3, 6],
        [2, 5, 8, 9],
        [0, 4, 7],
        [1, 3, 6, 9],
    ];
    const l4: BlockSpec[] = [];
    for (let row = 0; row < BLOCK.rows; row++) {
        for (let col = 0; col < BLOCK.cols; col++) {
            if (!gaps4[row].includes(col)) {
                l4.push({ col, row, color: rowColors4[row] });
            }
        }
    }

    // 5 — an outer frame in cyan with a hotpink cross through the middle.
    const l5: BlockSpec[] = [];
    for (let row = 0; row < BLOCK.rows; row++) {
        for (let col = 0; col < BLOCK.cols; col++) {
            const isFrame =
                col === 0 ||
                col === BLOCK.cols - 1 ||
                row === 0 ||
                row === BLOCK.rows - 1;
            const isCross = col === 4 || row === 2;
            if (isFrame || isCross) {
                l5.push({
                    col,
                    row,
                    color: isCross && !isFrame ? "hotpink" : "cyan",
                });
            }
        }
    }

    return [l1, l2, l3, l4, l5];
})();

// Mirror of the :root tokens in app/globals.css. The theme is dark-only and
// has had no light variant since SPEC 01, so these literals cannot drift on
// their own; the token each one copies is named beside it.
//
// The pastel sprites of the original are gone: the seven colour names map onto
// seven distinguishable accent tokens, none repeated.
export const PALETTE = {
    bg: "#0a0a0f", // --bg, the floor of the world
    paddle: "#00f5ff", // --cyan
    ball: "#e6e9ff", // --ink
    highlight: "rgba(255, 255, 255, 0.12)", // top strip of every block
    blocks: {
        red: "#d97a3a", // --bronze
        yellow: "#f5ff00", // --yellow
        cyan: "#00f5ff", // --cyan
        magenta: "#ff006e", // --magenta
        hotpink: "#ffcf3a", // --gold
        green: "#00ff88", // --green
        gray: "#c7d0e0", // --silver
    } as Record<BlockColor, string>,
} as const;
