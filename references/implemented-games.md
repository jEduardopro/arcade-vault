# Implemented games

The catalogue in `public.games` holds **eight** cartridges, but only **four** are really
playable: they have an engine under `app/lib/engines/`, a component under
`app/components/`, and an entry in `GAME_ENGINES` (`app/components/game-registry.ts`).
An id that is not in that map falls back to `fake-game-player.tsx`, the automatic-score
mock from SPEC 01.

Catalogue data below is read from the Supabase project (`public.games`), and the tuning
numbers from each engine's `constants.ts`. Titles, descriptions and on-screen control
labels are quoted verbatim in Spanish, because that is what the app shows.

Last checked: 2026-09-09.

## Summary

| # | Cartridge         | Id              | Category | Spec    | Engine                            | Origin                                     |
| - | ----------------- | --------------- | -------- | ------- | --------------------------------- | ------------------------------------------ |
| 1 | **ASTEROIDES**    | `asteroides`    | SHOOTER  | SPEC 05 | `app/lib/engines/asteroides/`     | `references/started-games/02-asteroids/`   |
| 2 | **CAÍDA**         | `caida`         | PUZZLE   | SPEC 07 | `app/lib/engines/caida/`          | `references/started-games/03-tetris/`      |
| 3 | **BLOQUE BUSTER** | `bloque-buster` | ARCADE   | SPEC 08 | `app/lib/engines/bloque-buster/`  | `references/started-games/04-arkanoid/`    |
| 4 | **SNAKE**         | `snake`         | ARCADE   | SPEC 09 | `app/lib/engines/snake/`          | none — only `snake-assets/fruits.png`      |

| Cartridge         | Lives | Levels                | HUD extra stat        | `max_score` | Audio | Binary asset | Skins |
| ----------------- | ----- | --------------------- | --------------------- | ----------- | ----- | ------------ | ----- |
| **ASTEROIDES**    | 3     | endless               | `3x` while active     | 10 000 000  | no    | —            | **3** |
| **CAÍDA**         | — (0) | endless, 10 lines ea. | `LÍNEAS`              | 1 000 000   | no    | —            | —     |
| **BLOQUE BUSTER** | 3     | endless, 5 patterns   | `BLOQUES`             | 100 000     | **yes** | 2 × `.mp3` | —     |
| **SNAKE**         | — (0) | 1–10, 5 fruits each   | `LARGO`               | 50 000      | no    | 1 × `.png`   | —     |

A cartridge with no lives passes `lives: 0` and `PlayerShell` renders `—`.

**Skins** (SPEC 10, 2026-09-17): only ASTEROIDES offers the three — `clasico`, `neon`
and `retro` — and only it shows the `.gp-themer` selector under the CRT frame, because
`PlayerShell` renders it just for a cartridge that passes `skin` and `onSkinChange`. The
other three have no `app/lib/engines/<game>/skins.ts` yet; the palettes are written by
the `skin-designer` agent and recorded, with their contrast measurements, in
`references/game-skins.md`. `clasico` is a byte-for-byte copy of each engine's `PALETTE`,
so nothing below changes on screen until a player picks another one.

---

## 1. ASTEROIDES — `asteroides`

Ported in **SPEC 05**, the first real game and the one that defined the engine contract.

**Catalogue row**

| Column       | Value                                               |
| ------------ | --------------------------------------------------- |
| `title`      | ASTEROIDES                                          |
| `short`      | "Pulveriza rocas a la deriva en gravedad cero."     |
| `cat`        | SHOOTER                                             |
| `cover`      | `cover-rocas`                                       |
| `color`      | `yellow`                                            |
| `plays`      | 15.6K (a seeded display string, not a live counter) |
| `sort_order` | 5                                                   |
| `max_score`  | 10 000 000 (the seeded default; never tightened)    |

**Controls** — `← →` ROTAR · `↑` PROPULSAR · `ESPACIO` DISPARAR · `P` / `Esc` pause.

**Rules and tuning** (`app/lib/engines/asteroides/constants.ts`)

- World 800×600, `MAX_DT` 0.05. 3 lives, 2 s between dying and respawning, 3 s of
  invincibility after it, and no asteroid spawns within 130 px of the centre.
- A ship rotates at 3.5 rad/s, thrusts at 260 px/s², drags at 0.987 per frame, and fires
  every 0.2 s. Bullets travel 520 px/s and live 1.1 s.
- Wrapping world: leave by one edge, come back through the opposite one.
- Three asteroid sizes. Radii 50 / 30 / 16, speeds 32 / 55 / 85 px/s, and **points run
  the other way — 20 large, 50 medium, 100 small**, so splitting pays. Each is an
  irregular 8–13-vertex polygon.
- Level 1 opens with 4 large asteroids; every later level with `3 + level`.
- The `3x` power-up drops 15 % of the time, is granted outright after 5 fruitless kills,
  drifts for 12 s and gives 5 s of triple shot spread 0.18 rad apart. It is the only
  cartridge that reports an extra stat conditionally: the HUD slot appears only while the
  timer runs.

**Notes** — every number is copied from `02-asteroids/game.js` unchanged. `PALETTE`
mirrors the `:root` tokens of `app/globals.css` because the engine does not read CSS.

Files: `constants.ts` 89 · `entities.ts` 356 · `engine.ts` 468 lines.

---

## 2. CAÍDA — `caida`

Ported in **SPEC 07**, the spec that established that the engine's world need not be the
playfield.

**Catalogue row**

| Column       | Value                                                    |
| ------------ | -------------------------------------------------------- |
| `title`      | CAÍDA                                                    |
| `short`      | "Encaja las piezas antes de que el techo te aplaste."    |
| `cat`        | PUZZLE                                                   |
| `cover`      | `cover-tetro`                                            |
| `color`      | `magenta`                                                |
| `plays`      | 31.8K                                                    |
| `sort_order` | 1                                                        |
| `max_score`  | 1 000 000 (tightened by its own migration)               |

**Controls** — `← →` MOVER · `↑` / `X` ROTAR · `↓` BAJAR · `ESPACIO` CAÍDA · `P` PAUSA.

**Rules and tuning** (`app/lib/engines/caida/constants.ts`)

- World 800×600, `MAX_DT` 0.05, but the well is only 300×600: 10 × 20 cells of 30 px,
  drawn centred at `x: 250`. The gutters stay empty except for the next-piece box at
  `(615, 60)`, 4 × 4 cells. Cheaper than a letterbox rule in `app/globals.css`, which is
  a literal port.
- Drop interval `max(0.1, 1 − (level − 1) × 0.09)` seconds — the original's
  `max(100, 1000 − (level − 1) × 90)` ms in seconds. A level every 10 lines.
- Line clears score 100 / 300 / 500 / 800 for 1–4 rows, multiplied by the level. Hard
  drop pays 2 per cell, soft drop 1 per row.
- Failed rotations try horizontal kicks in order `0, −1, +1, −2, +2`; if none clears, the
  piece stays put.
- Seven tetrominoes. The original's eighth piece — the 3×3 nut ring — is deliberately
  left out, which leaves exactly seven distinguishable accent tokens, one per piece and
  none repeated.

**Notes** — the pastel palette of the original is gone; pieces are repainted with the
`:root` tokens. No lives, so the HUD shows `—` and `LÍNEAS` in the extra slot.

Files: `constants.ts` 145 · `entities.ts` 284 · `engine.ts` 423 lines.

---

## 3. BLOQUE BUSTER — `bloque-buster`

Ported in **SPEC 08**. The only cartridge that makes a sound, the only one that listens to
its own canvas, and the only one with a tighter frame cap.

**Catalogue row**

| Column       | Value                                                |
| ------------ | ---------------------------------------------------- |
| `title`      | BLOQUE BUSTER                                        |
| `short`      | "Rebota la pelota y destruye muros de neón."         |
| `cat`        | ARCADE                                               |
| `cover`      | `cover-bricks`                                       |
| `color`      | `cyan`                                               |
| `plays`      | 12.4K                                                |
| `sort_order` | 0 (first card in the library)                        |
| `max_score`  | 100 000 (tightened by its own migration)             |

**Controls** — `RATÓN` / `← →` MOVER · `ESPACIO` LANZAR · `P` PAUSA. The mouse leads
because in an Arkanoid it is the instrument, not an extra; the arrows are the fallback.

**Rules and tuning** (`app/lib/engines/bloque-buster/constants.ts`)

- World 800×600, but **`MAX_DT` is 0.02**, not the 0.05 of the other three. It is the
  only number in the port that the original does not have: at the ×2 speed ceiling the
  ball covers 721 px/s, so a 0.02 tick moves it 14.4 px — under its own 16 px diameter.
  At 0.05 it would jump 36 px and could tunnel through a whole row.
- Paddle 81 × 14 at `y: 560`, 400 px/s under the arrows. Ball 16 px, base velocity
  (200, −300), ×1.1 per level up to a ×2 ceiling reached on level 9; from there only the
  pattern changes. Hitting the very edge of the paddle deflects up to 60°.
- Blocks: 10 × 6 of 64 × 24 from origin `(80, 80)`. 3 lives, 10 points a block, and a
  0.15 s explosion flash that grows 1.6× while fading.
- Five patterns — full grid, pyramid, checkerboard, gapped rows, frame plus cross — of
  60 / 40 / 30 / 39 / 39 blocks, 208 per full lap, recycled with
  `LEVELS[(level − 1) % LEVELS.length]`. That is what turns a five-level original into an
  endless game.

**Audio** — `sound.ts` plays the original's two `.mp3`, copied unchanged into
`public/games/bloque-buster/`, at the same five points `game.js` does: the three walls,
the paddle, and a block going. Volume 0.35 (the original plays at full blast), 4 voices
per effect so overlapping hits do not cut each other off, and `play()`'s rejection is
swallowed because autoplay policy can refuse a sound before the first gesture.
**Platform audio is still unbuilt**: there is no remembered mute and no control in
`PlayerShell`, and the other three cartridges stay silent.

**Notes** — the original's spritesheet is dropped; paddle, ball and blocks are canvas
primitives with a neon `shadowBlur` bloom. The `mousemove` listener is bound to the
canvas and removed by `destroy()`, and the pointer is converted through a live
`getBoundingClientRect()` because `.game-canvas` stretches over `.crt-screen` and the
factor changes with the window.

Files: `constants.ts` 228 · `entities.ts` 291 · `engine.ts` 479 · `sound.ts` 65 lines.

---

## 4. SNAKE — `snake`

Built in **SPEC 09**, the first cartridge with **no original at all**:
`references/started-games/snake-assets/` holds a sprite atlas and nothing else, so every
number in its `constants.ts` is a decision of the spec, and each one carries its reason.

It is also the only game so far whose spec **inserted** a catalogue row. SPEC 07 and
SPEC 08 inherited a seeded row and only moved its `max_score`; here the seeded row was
called SERPENTINA, so `20260904232142_replace_serpentina_with_snake.sql` deletes it and
inserts `snake` into the same slot — same `sort_order`, `cat`, `cover`, `color` and
seeded plays. `/games/serpentina` now 404s, and nothing ever linked there.

**Catalogue row**

| Column       | Value                                            |
| ------------ | ------------------------------------------------ |
| `title`      | SNAKE                                            |
| `short`      | "Crece a base de fruta sin morderte la cola."    |
| `cat`        | ARCADE                                           |
| `cover`      | `cover-snake`                                    |
| `color`      | `green`                                          |
| `plays`      | 9.1K                                             |
| `sort_order` | 2                                                |
| `max_score`  | 50 000                                           |

**Controls** — `← ↑ → ↓` MOVER · `WASD` MOVER · `P` PAUSA.

**Rules and tuning** (`app/lib/engines/snake/constants.ts`)

- Grid 20 × 15 cells of 40 px, which is the whole 800×600 world with no gutters. A 40 px
  cell is what keeps a fruit sprite readable inside the CRT frame; at 20 px it degrades
  into a coloured dot.
- Starts 3 segments long. A level every 5 fruits, capped at **level 10** — past that the
  step is already at its floor, and a level that changes nothing must not keep announcing
  itself.
- Step `max(0.07, 0.16 − 0.01 × (level − 1))` seconds: 0.16 s at level 1, 0.07 s from
  level 10. The floor exists because without it the last levels stop being playable and
  start depending on the display's refresh rate.
- 10 points a fruit, multiplied by the level. A perfect game — 297 fruits, filling all
  300 cells — scores 27 450, which is what keeps it under the row's 50 000 ceiling.
- Up to 2 turns queue between steps, so an L turn at top speed still executes both
  presses, one per step.
- `MAX_DT` 0.05 also bounds the step accumulator: the shortest step is 0.07 s, so a
  capped frame never fits twice and the snake can never take two steps at once coming
  back from another tab.

**Sprite sheet** — `sprites.ts` (the only engine with a loading gate, because here the
asset *is* the game) waits for `public/games/snake/fruits.png` before the first frame:
six 150 × 160 slots — apple, cherry, strawberry, grape, orange, lemon — drawn into a
32 × 34 box centred in the cell. The gate has a net, and any future one must copy the
shape: `onReady` fires on `error` as well as `load`, so a 404 costs the sprite and never
the game; the fruit falls back to a vector core; and the ready flag also covers an image
already in the browser cache, which resolves **synchronously** inside the factory.

Files: `constants.ts` 87 · `entities.ts` 273 · `engine.ts` 428 · `sprites.ts` 114 lines.

---

## Not implemented yet

These four are rows in `public.games` with a card in `/games` and a detail page, but
`/games/[id]/play` mounts `fake-game-player.tsx` — the mock that counts up a score on
its own. They have no engine, no registry entry and no scores.

| Cartridge        | Id            | Category | `sort_order` | `short`                                        |
| ---------------- | ------------- | -------- | ------------ | ---------------------------------------------- |
| **GLOTÓN**       | `gloton`      | ARCADE   | 3            | "Devora puntos y escapa de los fantasmas."     |
| **INVASORES**    | `invasores`   | SHOOTER  | 4            | "Defiende el planeta de filas alienígenas."    |
| **RANARIA**      | `ranaria`     | ARCADE   | 6            | "Cruza la autopista de pixeles."               |
| **DUELO PIXEL**  | `duelo-pixel` | VERSUS   | 7            | "Dos paletas. Una pelota. Reflejos máximos."   |

All four still carry the seeded `max_score` of 10 000 000. A spec that makes one playable
should tighten it, the way SPEC 07, SPEC 08 and SPEC 09 did.

## Adding the fifth

Design the spec with `/add-game` first — it carries the SPEC 05 engine contract and the
SPEC 06 catalogue constraints inside it — then build with `/spec-impl`. Every game so far
has cost exactly one `dynamic()` and one `GAME_ENGINES` entry, one folder under
`app/lib/engines/`, one component under `app/components/`, and usually one migration to
set `max_score`. Nothing on `/games/[id]/play` changes.

The four rules that keep an engine reusable, and that a new one must keep:

1. **It never imports React** (`grep -rn 'from "react"' app/lib/engines` must stay empty)
   and knows no DOM beyond its own canvas and the window it listens to for keys.
2. **It draws no HUD and no overlays** — it publishes `snapshot` and `status` through
   callbacks so React paints them.
3. **`snapshot` is emitted only when a value changes**, never once per frame.
4. **It exposes `destroy()`**, which the mounting `useEffect` must call in its cleanup, or
   StrictMode's double mount leaves two loops running.
