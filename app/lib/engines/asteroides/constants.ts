// Every tuning number of the game, copied from
// references/started-games/02-asteroids/game.js without changing a single one.
// Keeping them here is what lets entities.ts and engine.ts stay free of magic
// numbers, and what makes a later balance pass a one-file edit.

/** The world is a fixed 800x600 box; the canvas is only scaled to fit it. */
export const WORLD = { w: 800, h: 600 } as const;

/** Frame delta cap, in seconds. Prevents the spiral of death on tab blur. */
export const MAX_DT = 0.05;

export const SHIP = {
    rot: 3.5, // rad/s
    thrust: 260, // px/s^2
    drag: 0.987, // velocity factor per frame
    radius: 12,
    nose: 21, // muzzle offset from the centre
    invincible: 3, // seconds of blinking after respawning
    cooldown: 0.2, // seconds between shots
    // Silhouette, in ship space: nose, left wing, rear notch, right wing.
    hull: [
        [20, 0],
        [-12, -9],
        [-7, 0],
        [-12, 9],
    ],
    // Thruster flame: base, tip (length varies), base again.
    flame: { x: -8, y: 4, minLength: 6, maxLength: 14, skipChance: 0.35 },
    // Collision fudge factor applied to the asteroid radius, for feel.
    hitFudge: 0.82,
} as const;

export const BULLET = { speed: 520, ttl: 1.1, radius: 2 } as const;

// All three arrays are indexed by asteroid size (1 small, 2 medium, 3 large),
// so index 0 is unused padding.
export const RADII = [0, 16, 30, 50] as const;
export const SPEEDS = [0, 85, 55, 32] as const;
export const POINTS = [0, 100, 50, 20] as const;

export const ASTEROID = {
    speedJitter: 15, // +/- px/s on top of SPEEDS[size]
    rotSpeed: 1.2, // +/- rad/s
    minVerts: 8, // inclusive range: game.js uses randInt(8, 13)
    maxVerts: 13,
    minRadiusFactor: 0.6, // irregular polygon: radius between 60% and 100%
    maxRadiusFactor: 1,
} as const;

export const POWERUP = {
    dropChance: 0.15,
    guaranteedAfterKills: 5, // one is granted if the roll keeps failing
    duration: 5, // seconds of triple shot
    ttl: 12, // seconds before it drifts away
    tripleSpread: 0.18, // rad between the three bullets
    radius: 12,
    minSpeed: 20,
    maxSpeed: 40,
    blinkBelow: 2, // starts blinking with this many seconds left
} as const;

export const PARTICLE = {
    minSpeed: 30,
    maxSpeed: 130,
    minLife: 0.4,
    maxLife: 1.1,
    perAsteroidSize: 5, // count = size * 5
    onShipDeath: 14,
} as const;

export const RUN = {
    lives: 3,
    firstWave: 4, // large asteroids on level 1; later levels use 3 + level
    safeDist: 130, // no asteroid spawns this close to the centre
    deadTimer: 2, // seconds between losing a life and respawning
} as const;

// Mirror of the :root tokens in app/globals.css. The theme is dark-only and has
// had no light variant since SPEC 01, so these literals cannot drift on their
// own; the token each one copies is named beside it.
export const PALETTE = {
    bg: "#0a0a0f", // --bg
    ship: "#00f5ff", // --cyan
    asteroid: "#e6e9ff", // --ink
    bullet: "#f5ff00", // --yellow
    powerUp: "#ff006e", // --magenta
    flame: "#ffcf3a", // --gold
    particle: "230, 233, 255", // --ink as RGB components, for rgba() with alpha
} as const;
