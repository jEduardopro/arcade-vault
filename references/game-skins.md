# Game skins

Every skin of every playable cartridge, and the contrast it was measured at.
Maintained by the `skin-designer` agent (`.claude/agents/skin-designer.md`): it reads this
file before designing anything and writes to it before answering. Rows are never deleted — a
retuned skin keeps its history, so the same colour is not re-litigated next month.

Three skins, and `clasico` is the default:

- **`clasico`** — the `:root` palette the Vault already had. A byte-for-byte copy of each
  engine's `PALETTE`, so it changes nothing on screen.
- **`neon`** — same base, more saturation and more bloom.
- **`retro`** — monochrome amber phosphor, separated by luminance and never by hue.

The companion file is `references/implemented-games.md`, which describes what has been built.
Neither is `@`-imported: read them when the question is a game.

Last updated: 2026-09-17

## Coverage

| Cartridge      | Id              | `clasico` | `neon` | `retro` | Verdict                                                     |
| -------------- | --------------- | --------- | ------ | ------- | ----------------------------------------------------------- |
| ASTEROIDES     | `asteroides`    | ok        | ok     | ok      | completo — `app/lib/engines/asteroides/skins.ts`, 2026-09-17 |
| CAÍDA          | `caida`         | —         | —      | —       | ninguno — no `skins.ts` yet                                  |
| BLOQUE BUSTER  | `bloque-buster` | —         | —      | —       | ninguno — no `skins.ts` yet                                  |
| SNAKE          | `snake`         | —         | —      | —       | ninguno — no `skins.ts` yet                                  |

Shared module: `app/lib/skins.ts` exists since 2026-09-17 (`SkinId`, `SKIN_IDS`,
`SKIN_LABELS`, `DEFAULT_SKIN`, `isSkinId`).

## Measurements

Measured 2026-09-17 with the WCAG relative-luminance formula, each colour against the
background of its own skin. ASTEROIDES draws no grid, frame or highlight strip, so the
structural ceiling (≤ 3:1) has nothing to measure in this cartridge.

Background luminance (must be ≤ 0.05): `clasico` `#0a0a0f` = 0.0032, `neon` `#05050c` =
0.0017, `retro` `#0b0802` = 0.0025.

| Cartridge  | Skin      | Element             | Against       | Ratio | Bar        | Result                                          |
| ---------- | --------- | ------------------- | ------------- | ----- | ---------- | ----------------------------------------------- |
| ASTEROIDES | `clasico` | ship `#00f5ff`      | bg `#0a0a0f`  | 14.58 | floor      | pass                                            |
| ASTEROIDES | `clasico` | asteroid `#e6e9ff`  | bg `#0a0a0f`  | 16.43 | floor      | pass                                            |
| ASTEROIDES | `clasico` | bullet `#f5ff00`    | bg `#0a0a0f`  | 18.05 | floor      | pass                                            |
| ASTEROIDES | `clasico` | powerUp `#ff006e`   | bg `#0a0a0f`  | 5.15  | floor      | pass — the tightest value of the whole cartridge |
| ASTEROIDES | `clasico` | flame `#ffcf3a`     | bg `#0a0a0f`  | 13.39 | floor      | pass                                            |
| ASTEROIDES | `clasico` | particle `#e6e9ff`  | bg `#0a0a0f`  | 16.43 | floor      | pass — measured at alpha 1.0, it fades to 0      |
| ASTEROIDES | `clasico` | ship / flame        | each other    | 1.09  | separation | pass by hue: 137°                                |
| ASTEROIDES | `clasico` | asteroid / bullet   | each other    | 1.10  | separation | pass by hue: 170°                                |
| ASTEROIDES | `clasico` | ship / asteroid     | each other    | 1.13  | separation | pass by hue: 50°                                 |
| ASTEROIDES | `clasico` | bullet / flame      | each other    | 1.35  | separation | pass by luminance                                |
| ASTEROIDES | `clasico` | asteroid / particle | each other    | 1.00  | separation | exempt — the same colour by design, debris is the asteroid it came from |
| ASTEROIDES | `neon`    | ship `#00ffff`      | bg `#05050c`  | 16.21 | floor      | pass                                             |
| ASTEROIDES | `neon`    | asteroid `#f2f5ff`  | bg `#05050c`  | 18.66 | floor      | pass                                             |
| ASTEROIDES | `neon`    | bullet `#ffff1a`    | bg `#05050c`  | 18.94 | floor      | pass                                             |
| ASTEROIDES | `neon`    | powerUp `#ff2d95`   | bg `#05050c`  | 5.87  | floor      | pass — lifted from clasico's 5.15 on purpose     |
| ASTEROIDES | `neon`    | flame `#ffb300`     | bg `#05050c`  | 11.32 | floor      | pass                                             |
| ASTEROIDES | `neon`    | particle `#e0e8ff`  | bg `#05050c`  | 16.60 | floor      | pass — measured at alpha 1.0                     |
| ASTEROIDES | `neon`    | asteroid / bullet   | each other    | 1.02  | separation | pass by hue: 166°                                |
| ASTEROIDES | `neon`    | ship / particle     | each other    | 1.02  | separation | pass by hue: 45°                                 |
| ASTEROIDES | `neon`    | ship / bullet       | each other    | 1.17  | separation | pass by hue: 120°                                |
| ASTEROIDES | `neon`    | bullet / flame      | each other    | 1.67  | separation | pass by luminance                                |
| ASTEROIDES | `neon`    | asteroid / particle | each other    | 1.12  | separation | exempt — inherits clasico's "same material" pair |
| ASTEROIDES | `retro`   | asteroid `#fff3da`  | bg `#0b0802`  | 18.18 | floor      | pass — ramp step 6, the brightest                |
| ASTEROIDES | `retro`   | ship `#ffd069`      | bg `#0b0802`  | 13.79 | floor      | pass — ramp step 5                               |
| ASTEROIDES | `retro`   | bullet `#f8ac00`    | bg `#0b0802`  | 10.38 | floor      | pass — ramp step 4                               |
| ASTEROIDES | `retro`   | powerUp `#d99600`   | bg `#0b0802`  | 7.92  | floor      | pass — ramp step 3                               |
| ASTEROIDES | `retro`   | flame `#bb8100`     | bg `#0b0802`  | 5.96  | floor      | pass — ramp step 2                               |
| ASTEROIDES | `retro`   | particle `#a06f00`  | bg `#0b0802`  | 4.54  | floor      | pass — ramp step 1, the thinnest margin of all    |
| ASTEROIDES | `retro`   | bullet / powerUp    | each other    | 1.31  | separation | pass by luminance — 0.01 of margin                |
| ASTEROIDES | `retro`   | flame / particle    | each other    | 1.31  | separation | pass by luminance — 0.01 of margin                |
| ASTEROIDES | `retro`   | ship / asteroid     | each other    | 1.32  | separation | pass by luminance                                 |
| ASTEROIDES | `retro`   | ship / bullet       | each other    | 1.33  | separation | pass by luminance                                 |
| ASTEROIDES | `retro`   | powerUp / flame     | each other    | 1.33  | separation | pass by luminance                                 |
| ASTEROIDES | `retro`   | asteroid / particle | each other    | 4.00  | separation | pass — retro separates the pair clasico merges    |

Every `retro` value sits on hue 41–42°, one single amber, so the whole ramp is separated
by luminance alone. The remaining pairs of each skin are wider than the ones listed and
were checked in the same run.

## Out of scope

| Cartridge      | Id            | Why                                                                            |
| -------------- | ------------- | ------------------------------------------------------------------------------ |
| GLOTÓN         | `gloton`      | Not in `GAME_ENGINES`: still mounts `fake-game-player.tsx`, has no canvas.      |
| INVASORES      | `invasores`   | Not in `GAME_ENGINES`: still mounts `fake-game-player.tsx`, has no canvas.      |
| RANARIA        | `ranaria`     | Not in `GAME_ENGINES`: still mounts `fake-game-player.tsx`, has no canvas.      |
| DUELO PÍXEL    | `duelo-pixel` | Not in `GAME_ENGINES`: still mounts `fake-game-player.tsx`, has no canvas.      |

These four are not failures. They get skins when they get an engine, not before.

## Wiring

SPEC 10 built the seam on 2026-09-17, for ASTEROIDES only. Its three skins paint.

| What                                                                                 | Where                                                                | State                                     |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ----------------------------------------- |
| Third parameter `skin: SkinId = DEFAULT_SKIN` on `createAsteroidsEngine`             | `app/lib/engines/asteroides/engine.ts`                               | done                                      |
| `setSkin()` on `EngineHandle`; repaints a live engine without remounting it          | `app/lib/engines/asteroides/engine.ts`                               | done                                      |
| `draw(ctx, palette)` instead of importing the module constant                        | `app/lib/engines/asteroides/entities.ts`                             | done                                      |
| `glow` applied as `shadowBlur` / `shadowColor`, inside each drawable's save/restore   | `app/lib/engines/asteroides/entities.ts`, `setGlow()`                 | done                                      |
| Preference store `av_skin`, `useSyncExternalStore`, server snapshot = `DEFAULT_SKIN` | `app/lib/skin-store.tsx`, patterned on `app/lib/session.tsx`          | done                                      |
| Selector reusing `.gp-themer` and its swatches; nothing new in the stylesheet         | `app/components/player-shell.tsx`, `app/globals.css` lines 1601–1632  | done, behind optional props               |
| Same three changes for the other engines                                              | `app/lib/engines/{caida,bloque-buster,snake}/`                        | blocked: those three have no `skins.ts`   |
| Leaked literal: fruit halo painted `rgba(255, 0, 110, 0.35)` / `…, 0)` by hand        | `app/lib/engines/snake/entities.ts` lines 255–256                     | blocked, same reason                      |
| Leaked literal: head glow radius written as a bare `12`                               | `app/lib/engines/snake/entities.ts` line 184                          | blocked, same reason                      |
| `GLOW = { paddle: 14, ball: 10, block: 6 }` belongs to the skin, not to the tuning    | `app/lib/engines/bloque-buster/constants.ts` line 75                  | blocked, same reason                      |
| `skins.ts` still missing for `caida`, `bloque-buster` and `snake`                     | `app/lib/engines/<game>/skins.ts`                                     | next `skin-designer` run                  |

`PALETTE` in `app/lib/engines/asteroides/constants.ts` stays where it is and is no
longer read by anything. It is the reference `clasico` is checked against: a value in
`clasico` that differs from one there is a bug, not a decision.

The selector is wired through two **optional** props of `PlayerShell`, `skin` and
`onSkinChange`, and only renders when a cartridge passes both. That is what keeps the
three cartridges above — and the four that still mount `fake-game-player.tsx` — from
showing swatches that would paint nothing.

Note, 2026-09-17: `specs/game-jam/ducks/` holds two drafts that also call themselves
SPEC 10. They live outside the numbered sequence and only one is ever promoted, so
whichever is promoted gets renumbered then; `specs/10-costura-de-skins.md` holds the slot.
