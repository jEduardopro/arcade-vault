// The three skins of SNAKE.
//
// The shape of Palette is the shape PALETTE already has in constants.ts — five
// keys, the smallest of the four engines — plus the `glow` block every skin
// carries. The four engines differ on purpose and are not harmonised here.
//
// The fields are typed `string` and not the literals of `typeof PALETTE`:
// PALETTE is declared `as const`, so its type is a set of string literals that
// no second skin could ever satisfy.
//
// `halo` stays a plain hex. Today entities.ts paints the fruit's radial halo
// with two hand-written stops, "rgba(255, 0, 110, 0.35)" and
// "rgba(255, 0, 110, 0)", instead of deriving them from PALETTE.halo. #ff006e
// is exactly 255, 0, 110, so once the wiring derives both stops from `halo`
// (at the same 0.35 and 0 alphas) `clasico` paints the very same pixels.
//
// What a palette cannot reach: the fruit itself is a sprite cropped from
// public/games/snake/fruits.png and drawn with drawImage, so no skin recolours
// it. A palette only paints the halo under it and the vector fallback core
// that sprites.ts draws when the sheet fails to load.
//
// This file imports nothing but the shared SkinId: the engines are free of
// React and stay that way.
//
// Contrast: every value below was measured against its own skin's background
// with the WCAG formula and recorded in references/game-skins.md. Three bars —
// foreground floor >= 4.5:1, mutual separation >= 1.3:1 or >= 30 deg of hue,
// structural ceiling <= 3:1 — and a background luminance <= 0.05. Colours
// with alpha were composited over their own skin's background first.

import type { SkinId } from "@/app/lib/skins";

/**
 * Blur radius, in canvas units, for each drawable. These used to be bare
 * literals scattered over two files — the `12` of the head in entities.ts and
 * the `14` of the vector fruit in sprites.ts — with the body passing `0`, so
 * `clasico` keeps exactly those three values. entities.ts and sprites.ts now
 * read them from here.
 */
export type Glow = {
    /** shadowBlur of the head segment. */
    head: number;
    /** shadowBlur of every body segment; 0 skips withGlow() entirely. */
    body: number;
    /** shadowBlur of the vector fallback fruit, drawn only without the sheet. */
    fruit: number;
};

export type Palette = {
    /** Floor fill of drawGrid(); it is also what clears the previous frame. */
    bg: string;
    /** The 1 px grid lines. An rgba(), drawn straight as a strokeStyle. */
    grid: string;
    /** segments[0], painted last so it sits over its neighbour. */
    head: string;
    /** Every other segment. Must stay apart from `head` (separation bar). */
    body: string;
    /** Radial glow under the fruit, and the solid core of the vector fallback. */
    halo: string;
    glow: Glow;
};

/**
 * `clasico` is not a design: it is a copy. Every value is read out of
 * constants.ts and reproduced byte for byte, so adding skins changes nothing
 * on screen until somebody picks another one. A value that differs from
 * PALETTE is a bug, not a decision.
 */
const clasico: Palette = {
    bg: "#0a0a0f", // PALETTE.bg — --bg
    grid: "rgba(255, 255, 255, 0.06)", // PALETTE.grid — --line-2
    head: "#00ff88", // PALETTE.head — --green
    body: "#00cc6a", // PALETTE.body — a dimmer --green
    halo: "#ff006e", // PALETTE.halo — --magenta
    // Today's literals, unchanged: 12 on the head (entities.ts), none on the
    // body, 14 on the vector fruit (sprites.ts).
    glow: {
        head: 12,
        body: 0,
        fruit: 14,
    },
};

/**
 * `neon` is the same chromatic base pushed. --green is already at full HSV
 * saturation, so the head is pushed the way a neon tube is — towards a
 * white-hot core on the same 153 deg hue — and the body is pulled down so the
 * pair separates *more* than in clasico (1.76 against 1.59), because here the
 * head's bloom bleeds onto the neck. The background, the halo and the grid
 * follow the same tokens ASTEROIDES's neon took, so the two cartridges agree.
 */
const neon: Palette = {
    bg: "#05050c", // --bg taken deeper, as in asteroides/neon. Luminance 0.0017.
    grid: "rgba(0, 245, 255, 0.08)", // --line's cyan, at a hairline: 1.12:1.
    head: "#3dffa8", // --green #00ff88 lifted to a hot core, 15.55:1, hue 153.
    body: "#00c46c", // --green dimmed one step below clasico's body, 8.82:1.
    halo: "#ff2d95", // --magenta lifted, as asteroides/neon powerUp: 5.87:1.
    // More bloom is what neon means. The body gets a small one so the whole
    // snake reads as a lit tube, not as dark boxes behind a lit head; it stays
    // well under the head's so the head still leads.
    glow: {
        head: 18,
        body: 6,
        fruit: 20,
    },
};

/**
 * `retro` is monochrome amber phosphor. Every value sits on hue 41-42 deg and
 * the separation comes from luminance alone, never from hue. The rungs are the
 * same six-step ramp asteroides/retro uses against the same #0b0802, so the
 * amber is one amber across the Vault:
 *
 *   step 6 #fff3da 18.18:1 · step 5 #ffd069 13.79:1 · step 4 #f8ac00 10.38:1
 *   step 3 #d99600  7.92:1 · step 2 #bb8100  5.96:1 · step 1 #a06f00  4.54:1
 *
 * SNAKE uses steps 6, 4 and 2 — every pair two rungs apart, about 1.75:1, not
 * the 1.31-1.33:1 that adjacent rungs give — and keeps clasico's order:
 * head brightest, body under it, fruit halo the dimmest of the three.
 */
const retro: Palette = {
    bg: "#0b0802", // Near-black with an amber bias. Luminance 0.0025.
    grid: "rgba(248, 172, 0, 0.08)", // Step 4 at 8% alpha: 1.11:1, a hairline.
    head: "#fff3da", // Ramp step 6, 18.18:1 — the head, brightest.
    body: "#f8ac00", // Ramp step 4, 10.38:1 — 1.75:1 under the head.
    halo: "#bb8100", // Ramp step 2, 5.96:1 — 1.74:1 under the body.
    // A phosphor tube blooms, but gently: a wide blur would close the gap
    // between head and neck. The body gets none, as in clasico.
    glow: {
        head: 6,
        body: 0,
        fruit: 6,
    },
};

/** Every skin of this cartridge, keyed by the shared id. */
export const SKINS: Record<SkinId, Palette> = { clasico, neon, retro };
