// The three skins of BLOQUE BUSTER.
//
// The shape of Palette is the shape PALETTE already has in constants.ts — the
// four engines differ on purpose and are not harmonised here. `blocks` is
// indexed by the original's colour *names*, not by colours: `red` paints
// bronze in clasico and amber in retro. The names stay, what they map to is
// repainted.
//
// The fields are typed `string` and not the literals of `typeof PALETTE`:
// PALETTE is declared `as const`, so its type is a set of string literals that
// no second skin could ever satisfy.
//
// This file imports nothing but the shared SkinId: the engines are free of
// React and stay that way. That is also why Blocks spells out the seven names
// instead of importing BlockColor from constants.ts; once draw() indexes
// `palette.blocks[this.color]` with a BlockColor, a name missing here is a
// compile error there, so the two cannot drift silently.
//
// Contrast: every value below was measured against its own skin's background
// with the WCAG formula and recorded in references/game-skins.md. Three bars —
// foreground floor >= 4.5:1, mutual separation >= 1.3:1 or >= 30 deg of hue,
// structural ceiling <= 3:1 — and a background luminance <= 0.05. The highlight
// strip is the only structural element of this cartridge; it is measured
// composited over the face it sits on.

import type { SkinId } from "@/app/lib/skins";

/** The seven colour names of the original, as in BlockColor. */
export type Blocks = {
    red: string;
    yellow: string;
    cyan: string;
    magenta: string;
    hotpink: string;
    green: string;
    gray: string;
};

/**
 * Blur radius, in px of shadowBlur, for each drawable. Today these numbers are
 * GLOW in constants.ts; they move here because the bloom is what tells the
 * skins apart. Explosion reuses `block`, exactly as it reused GLOW.block. Since
 * SPEC 10 entities.ts reads these, and GLOW is gone from constants.ts.
 */
export type Glow = {
    paddle: number;
    ball: number;
    block: number;
};

export type Palette = {
    /** Cleared once per frame in engine.ts. */
    bg: string;
    /** The paddle's filled rectangle. */
    paddle: string;
    /** The 16 px disc. */
    ball: string;
    /** Translucent strip on top of the paddle and of every block face. */
    highlight: string;
    /** Block faces and the explosion outline of a dying block. */
    blocks: Blocks;
    glow: Glow;
};

/**
 * `clasico` is not a design: it is a copy. Every value is read out of
 * constants.ts (PALETTE and GLOW) and reproduced byte for byte, so adding
 * skins changes nothing on screen until somebody picks another one. A value
 * that differs from those is a bug, not a decision.
 */
const clasico: Palette = {
    bg: "#0a0a0f", // PALETTE.bg — --bg
    paddle: "#00f5ff", // PALETTE.paddle — --cyan
    ball: "#e6e9ff", // PALETTE.ball — --ink
    highlight: "rgba(255, 255, 255, 0.12)", // PALETTE.highlight
    blocks: {
        red: "#d97a3a", // PALETTE.blocks.red — --bronze
        yellow: "#f5ff00", // PALETTE.blocks.yellow — --yellow
        cyan: "#00f5ff", // PALETTE.blocks.cyan — --cyan
        magenta: "#ff006e", // PALETTE.blocks.magenta — --magenta
        hotpink: "#ffcf3a", // PALETTE.blocks.hotpink — --gold
        green: "#00ff88", // PALETTE.blocks.green — --green
        gray: "#c7d0e0", // PALETTE.blocks.gray — --silver
    },
    glow: { paddle: 14, ball: 10, block: 6 }, // GLOW, unchanged
};

/**
 * `neon` is the same chromatic base pushed: each token keeps its hue family
 * and gains saturation or luminance, and the bloom grows by about half. The
 * background drops below --bg so the halos have somewhere to fall. Every
 * value shared with ASTEROIDES is the very same hex as its neon, so one skin
 * means one look across the Vault.
 *
 * Every pair of blocks that shares a level passes the separation bar; most of
 * them by hue, which is what neon is for.
 */
const neon: Palette = {
    bg: "#05050c", // --bg taken deeper, as in ASTEROIDES. Luminance 0.0017.
    paddle: "#00ffff", // --cyan with its blue channel maxed, 16.21:1.
    ball: "#f2f5ff", // --ink lifted, 18.66:1; the ball is what you watch.
    // A brighter sheen than clasico's 0.12, still a hairline: 1.16:1 at most
    // over the face it sits on.
    highlight: "rgba(255, 255, 255, 0.16)",
    blocks: {
        // --bronze pushed to a saturated orange, 7.09:1. It shares rows with
        // gold, and stays 1.60:1 under it: told apart by luminance, since
        // their hues are only 21 deg apart.
        red: "#ff6a1a",
        yellow: "#ffff1a", // --yellow with red maxed, 18.94:1.
        cyan: "#00ffff", // --cyan, the paddle's hue as in clasico.
        magenta: "#ff2d95", // --magenta lifted, floor 5.15 -> 5.87.
        hotpink: "#ffb300", // --gold pushed to full amber chroma, 11.32:1.
        // --green rotated 8 deg toward the green primary. Pure cyan moved to
        // 180 deg, and clasico's 152 deg green would sit only 28 deg from it;
        // 144 deg restores the hue gap to 36 deg.
        green: "#00ff66",
        gray: "#d0dcff", // --silver cooled and lifted, 14.87:1.
    },
    // Bloom scaled by how much each thing matters: the paddle carries the
    // look, the ball needs a tracer halo, and blocks get the least because
    // they sit 2 px apart and a wider blur would bleed row into row.
    glow: { paddle: 22, ball: 16, block: 10 },
};

/**
 * `retro` is monochrome amber phosphor: every value sits on hue 41-42 deg, and
 * the separation comes from luminance alone. It uses the six-rung ramp of
 * ASTEROIDES' retro, the same tube in every cartridge, from 4.54:1 to 18.18:1
 * against #0b0802 in steps of 1.31-1.33.
 *
 * Seven block colours on six rungs is not an oversight, it is arithmetic: a
 * seventh rung at 1.3:1 above a 4.5:1 floor needs 4.5 * 1.3^6 = 21.7:1, and
 * nothing reaches that on any background (pure white on pure black is 21:1).
 * What makes it work is LEVELS: `red` lives only in patterns 1 and 4 and
 * `gray` only in pattern 2, so they never share a frame and can share a rung.
 * Every other pair coexists somewhere and is at least 1.31:1 apart.
 *
 * The rungs follow clasico's own luminance order — yellow brightest, magenta
 * dimmest — so the hierarchy of a wall does not flip between skins.
 */
const retro: Palette = {
    bg: "#0b0802", // Near-black with an amber bias, as in ASTEROIDES. 0.0025.
    // Rung 4, the cyan block's rung: clasico paints paddle and cyan blocks
    // with the same token, and the two never overlap (paddle at y 560, the
    // last block row ends at y 224). 1.75:1 under the ball resting on it.
    paddle: "#f8ac00",
    // Rung 6, the brightest. It equals the yellow block (1.00:1) because no
    // seventh rung exists above it; the ball is told apart from that block
    // by shape and motion, as clasico's ball already is from gray (1.29:1).
    ball: "#fff3da",
    // The phosphor's own pale amber at the same 0.12: 1.21:1 at most over the
    // face it sits on, invisible over rung 6.
    highlight: "rgba(255, 243, 218, 0.12)",
    blocks: {
        yellow: "#fff3da", // Rung 6, 18.18:1 — clasico's brightest (18.05).
        green: "#ffd069", // Rung 5, 13.79:1 — clasico 14.73.
        cyan: "#f8ac00", // Rung 4, 10.38:1 — clasico 14.58; the base amber.
        hotpink: "#d99600", // Rung 3, 7.92:1 — clasico 13.39.
        // Rung 2, 5.96:1, shared by red and gray, which never coexist.
        red: "#bb8100",
        gray: "#bb8100",
        magenta: "#a06f00", // Rung 1, 4.54:1 — clasico's dimmest (5.15).
    },
    // A phosphor tube blooms, but gently. Blocks sit 2 px apart with rungs
    // only 1.31:1 apart, so their blur stays at 3: wider, and a bright row
    // would wash over its neighbour and close the gap.
    glow: { paddle: 6, ball: 6, block: 3 },
};

/** Every skin of this cartridge, keyed by the shared id. */
export const SKINS: Record<SkinId, Palette> = { clasico, neon, retro };
