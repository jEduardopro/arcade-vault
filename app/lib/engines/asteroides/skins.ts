// The three skins of ASTEROIDES.
//
// The shape of Palette is the shape PALETTE already has in constants.ts — the
// four engines differ on purpose and are not harmonised here. `particle` stays
// a bare "r, g, b" component string because entities.ts interpolates it into an
// rgba() with a live alpha: `rgba(${PALETTE.particle}, ${alpha})`.
//
// The fields are typed `string` and not the literals of `typeof PALETTE`:
// PALETTE is declared `as const`, so its type is a set of string literals that
// no second skin could ever satisfy.
//
// This file imports nothing but the shared SkinId: the engines are free of
// React and stay that way.
//
// Contrast: every value below was measured against its own skin's background
// with the WCAG formula and recorded in references/game-skins.md. Three bars —
// foreground floor >= 4.5:1, mutual separation >= 1.3:1 or >= 30 deg of hue,
// structural ceiling <= 3:1 — and a background luminance <= 0.05. ASTEROIDES
// draws no grid, frame or highlight strip, so the ceiling bar has nothing to
// measure here.

import type { SkinId } from "@/app/lib/skins";

/**
 * Blur radius, in canvas units, for each drawable. Today ASTEROIDES sets no
 * shadowBlur at all, so `clasico` is all zeros and changes nothing on screen;
 * the bloom is what `neon` is defined by, and `retro` carries the small halo a
 * phosphor tube has. Nothing reads these until the wiring spec lands.
 */
export type Glow = {
    ship: number;
    asteroid: number;
    bullet: number;
    powerUp: number;
    flame: number;
    particle: number;
};

export type Palette = {
    /** Cleared once per frame in engine.ts. */
    bg: string;
    /** Hull outline and its notch. */
    ship: string;
    /** Irregular polygon outline, every size. */
    asteroid: string;
    /** The 2 px dot. */
    bullet: string;
    /** Rotating square and its "3x" caption. */
    powerUp: string;
    /** Thruster flame, drawn only while thrusting. */
    flame: string;
    /** RGB components, no alpha: debris fades out through its own alpha. */
    particle: string;
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
    ship: "#00f5ff", // PALETTE.ship — --cyan
    asteroid: "#e6e9ff", // PALETTE.asteroid — --ink
    bullet: "#f5ff00", // PALETTE.bullet — --yellow
    powerUp: "#ff006e", // PALETTE.powerUp — --magenta
    flame: "#ffcf3a", // PALETTE.flame — --gold
    particle: "230, 233, 255", // PALETTE.particle — --ink as components
    // No engine of ASTEROIDES touches shadowBlur today. Zero keeps it that way.
    glow: {
        ship: 0,
        asteroid: 0,
        bullet: 0,
        powerUp: 0,
        flame: 0,
        particle: 0,
    },
};

/**
 * `neon` is the same chromatic base pushed: each token keeps its hue family
 * and gains saturation or luminance, and the bloom goes from nothing to a real
 * halo. The background drops below --bg so the halos have somewhere to fall.
 */
const neon: Palette = {
    bg: "#05050c", // --bg taken deeper, so the bloom reads. Luminance 0.0017.
    ship: "#00ffff", // --cyan #00f5ff with its blue channel maxed: pure cyan.
    asteroid: "#f2f5ff", // --ink lifted; the hazard stays the brightest thing.
    bullet: "#ffff1a", // --yellow #f5ff00 with red maxed: hotter, still yellow.
    powerUp: "#ff2d95", // --magenta #ff006e lifted, floor 5.15 -> 5.87.
    flame: "#ffb300", // --gold #ffcf3a pushed to full amber chroma.
    particle: "224, 232, 255", // --ink lifted, one step under the asteroid.
    // Bloom scaled by how much of the frame each thing occupies: the ship and
    // the pickup carry the look, the 2 px bullet needs less to read as a
    // tracer, and the 1 px particle stroke gets none — a blur only smears it.
    glow: {
        ship: 14,
        asteroid: 6,
        bullet: 10,
        powerUp: 12,
        flame: 8,
        particle: 0,
    },
};

/**
 * `retro` is monochrome amber phosphor. Every value sits on one hue — 41 deg,
 * the P3 amber of an eighties tube — and the separation comes from luminance
 * alone, never from hue: six steps of roughly 1.32:1 between adjacent rungs,
 * from 4.54:1 at the bottom to 18.18:1 at the top against #0b0802.
 *
 * The order of the ramp mirrors clasico's own hierarchy: the asteroid is the
 * brightest thing there (16.43:1 against 14.58:1 for the ship), so it is the
 * brightest here too, and the hazard never gets lost in its own debris.
 */
const retro: Palette = {
    bg: "#0b0802", // Near-black with an amber bias. Luminance 0.0025.
    asteroid: "#fff3da", // Ramp step 6, 18.18:1 — the hazard, brightest.
    ship: "#ffd069", // Ramp step 5, 13.79:1 — 1.32:1 under the asteroid.
    bullet: "#f8ac00", // Ramp step 4, 10.38:1 — the base amber, undiluted.
    powerUp: "#d99600", // Ramp step 3, 7.92:1.
    flame: "#bb8100", // Ramp step 2, 5.96:1 — exhaust glows under its hull.
    particle: "160, 111, 0", // Ramp step 1, 4.54:1 — debris, dimmest, still
    // above the 4.5 floor at full alpha.
    // A phosphor tube blooms, but gently: a wide blur would close the 1.32:1
    // gaps between rungs and turn the ramp back into one amber smear.
    glow: {
        ship: 6,
        asteroid: 4,
        bullet: 6,
        powerUp: 6,
        flame: 6,
        particle: 0,
    },
};

/** Every skin of this cartridge, keyed by the shared id. */
export const SKINS: Record<SkinId, Palette> = { clasico, neon, retro };
