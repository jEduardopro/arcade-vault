// Every tuning number of the game.
//
// Unlike the three engines before it, SNAKE has no original to copy from:
// references/started-games/snake-assets/ holds a sprite atlas and nothing else.
// So every value here is a decision of SPEC 09 and each one carries the reason
// it has the value it has, where the other ports could just cite game.js.

/** The world is a fixed 800x600 box, which is already the 4/3 of .crt-screen,
 * so .game-canvas of SPEC 05 covers it and this game needs no CSS. */
export const WORLD = { w: 800, h: 600 } as const;

/**
 * Frame delta cap, in seconds. The same 0.05 as ASTEROIDES and CAIDA, and here
 * it also bounds the step accumulator: the shortest step is SPEED.floor, 0.07,
 * so a capped dt never fits twice in one frame and the snake can never take
 * two steps at once coming back from another tab.
 */
export const MAX_DT = 0.05;

/** 20 * 40 = 800 and 15 * 40 = 600: the grid is the whole world, with no
 * gutters. A 40 px cell is what lets a fruit sprite still read inside the
 * CRT frame; at 20 px it degrades into a coloured dot. */
export const GRID = { cols: 20, rows: 15, cell: 40 } as const;

export const RUN = {
    startLength: 3, // segments the snake begins with
    fruitsPerLevel: 5, // level = floor(fruits / 5) + 1
    /**
     * The level stops where the speed stops. Past level 10 the step is already
     * at its floor, so a level that changes nothing must not keep announcing
     * itself — and it is what keeps a perfect game under the row's max_score:
     * filling all 300 cells is 297 fruits, or 10 * (5 * (1+..+9) + 10 * 252)
     * = 27 450 points against a ceiling of 50 000.
     */
    maxLevel: 10,
    pointsPerFruit: 10, // multiplied by the current level
} as const;

/**
 * Seconds per step. stepSeconds(1) = 0.16 and stepSeconds(10) = 0.07, and from
 * there it does not drop: without a floor the last levels stop being playable
 * and start depending on the display's refresh rate.
 */
export const SPEED = { start: 0.16, perLevel: 0.01, floor: 0.07 } as const;

/** Seconds the snake takes to advance one cell at this level. */
export function stepSeconds(level: number): number {
    return Math.max(SPEED.floor, SPEED.start - SPEED.perLevel * (level - 1));
}

/**
 * Pending turns queued between two steps. With room for 2 an L turn at top
 * speed still executes both presses, one per step; with room for 1 the second
 * one is dropped.
 */
export const TURN_QUEUE_MAX = 2;

/**
 * The six slots of public/games/snake/fruits.png, in order: apple, cherry,
 * strawberry, grape, orange, lemon. Slot `i` always starts at `i * slot.w`,
 * which is the whole point of cropping our own sheet instead of shipping the
 * 585 KB atlas and carrying its coordinate table around.
 *
 * How the sheet is generated is in section 3.2 of the spec. The names in the
 * atlas's own sprites.js are not reliable and were not used.
 */
export const SHEET = {
    src: "/games/snake/fruits.png",
    slot: { w: 150, h: 160 },
    count: 6,
} as const;

/**
 * The destination box of a fruit, centred in its cell. 34 px tall keeps 3 px
 * of air against the grid line, and the width follows the slot's 150/160 so
 * the sprite is not squashed.
 */
export const FOOD_DRAW = { w: 32, h: 34 } as const;

/** Mirror of the :root tokens in app/globals.css. The engine does not read CSS. */
export const PALETTE = {
    bg: "#0a0a0f", // --bg
    grid: "rgba(255, 255, 255, 0.06)", // --line-2
    head: "#00ff88", // --green
    body: "#00cc6a", // a dimmer --green, so the head reads at a glance
    halo: "#ff006e", // --magenta, the glow under the fruit
} as const;
