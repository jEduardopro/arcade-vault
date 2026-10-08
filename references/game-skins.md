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

Last updated: 2026-10-08

## Coverage

| Cartridge      | Id              | `clasico` | `neon` | `retro` | Verdict                                                     |
| -------------- | --------------- | --------- | ------ | ------- | ----------------------------------------------------------- |
| ASTEROIDES     | `asteroides`    | ok        | ok     | ok      | completo — `app/lib/engines/asteroides/skins.ts`, 2026-09-17 |
| CAÍDA          | `caida`         | —         | —      | —       | ninguno — no `skins.ts` yet                                  |
| BLOQUE BUSTER  | `bloque-buster` | ok        | ok     | ok      | completo — `app/lib/engines/bloque-buster/skins.ts`, 2026-10-08; selector wired 2026-10-08 (`bloque-buster-game.tsx` passes `skin` + `onSkinChange`) |
| SNAKE          | `snake`         | ok        | ok     | ok      | completo — `app/lib/engines/snake/skins.ts`, 2026-10-08; selector wired 2026-10-08 (the fruit sprite PNG is not recoloured, see Wiring) |

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

### SNAKE

Measured 2026-10-08, same formula, each colour against its own skin's background. Colours
with alpha — the grid and the halo's 0.35 peak — were composited over that background
first. Backgrounds are the same three as ASTEROIDES, so the luminances above hold. The fruit
is a sprite drawn with `drawImage` and no palette recolours it, so what is measured is the
halo under it and the solid core of the vector fallback (`sprites.ts`), which is `halo` at
alpha 1. The halo peak is not a floor element — the sprite on top of it is — so its row is
`info` and gates nothing.

| Cartridge | Skin      | Element                        | Against      | Ratio | Bar        | Result                                              |
| --------- | --------- | ------------------------------ | ------------ | ----- | ---------- | --------------------------------------------------- |
| SNAKE     | `clasico` | head `#00ff88`                 | bg `#0a0a0f` | 14.73 | floor      | pass                                                |
| SNAKE     | `clasico` | body `#00cc6a`                 | bg `#0a0a0f` | 9.26  | floor      | pass                                                |
| SNAKE     | `clasico` | halo / fallback fruit `#ff006e` | bg `#0a0a0f` | 5.15  | floor      | pass — the tightest value of the cartridge           |
| SNAKE     | `clasico` | halo peak, α 0.35 → `#600730`  | bg `#0a0a0f` | 1.48  | info       | decorative glow under the sprite                     |
| SNAKE     | `clasico` | grid `rgba(255,255,255,0.06)` → `#19191d` | bg `#0a0a0f` | 1.13 | ceiling | pass — the reference hairline                 |
| SNAKE     | `clasico` | head / body                    | each other   | 1.59  | separation | pass by luminance (hue 1° apart, so luminance only)  |
| SNAKE     | `clasico` | body / halo                    | each other   | 1.80  | separation | pass by luminance and by hue: 177°                   |
| SNAKE     | `clasico` | head / halo                    | each other   | 2.86  | separation | pass by luminance and by hue: 178°                   |
| SNAKE     | `neon`    | head `#3dffa8`                 | bg `#05050c` | 15.55 | floor      | pass                                                |
| SNAKE     | `neon`    | body `#00c46c`                 | bg `#05050c` | 8.82  | floor      | pass — retuned from `#00d977` (10.83) in this run    |
| SNAKE     | `neon`    | halo / fallback fruit `#ff2d95` | bg `#05050c` | 5.87  | floor      | pass — same lift as asteroides/neon powerUp          |
| SNAKE     | `neon`    | halo peak, α 0.35              | bg `#05050c` | 1.57  | info       | decorative glow under the sprite                     |
| SNAKE     | `neon`    | grid `rgba(0,245,255,0.08)` → `#05181f` | bg `#05050c` | 1.12 | ceiling | pass                                          |
| SNAKE     | `neon`    | head / body                    | each other   | 1.76  | separation | pass by luminance (hue 0° apart, so luminance only)  |
| SNAKE     | `neon`    | body / halo                    | each other   | 1.50  | separation | pass by luminance and by hue: 177°                   |
| SNAKE     | `neon`    | head / halo                    | each other   | 2.65  | separation | pass by luminance and by hue: 177°                   |
| SNAKE     | `retro`   | head `#fff3da`                 | bg `#0b0802` | 18.18 | floor      | pass — ramp step 6                                   |
| SNAKE     | `retro`   | body `#f8ac00`                 | bg `#0b0802` | 10.38 | floor      | pass — ramp step 4                                   |
| SNAKE     | `retro`   | halo / fallback fruit `#bb8100` | bg `#0b0802` | 5.96  | floor      | pass — ramp step 2                                   |
| SNAKE     | `retro`   | halo peak, α 0.35 → `#493201`  | bg `#0b0802` | 1.66  | info       | decorative glow under the sprite                     |
| SNAKE     | `retro`   | grid `rgba(248,172,0,0.08)` → `#1e1502` | bg `#0b0802` | 1.11 | ceiling | pass                                         |
| SNAKE     | `retro`   | head / body                    | each other   | 1.75  | separation | pass by luminance — two rungs apart                  |
| SNAKE     | `retro`   | body / halo                    | each other   | 1.74  | separation | pass by luminance — two rungs apart                  |
| SNAKE     | `retro`   | head / halo                    | each other   | 3.05  | separation | pass by luminance — four rungs apart                 |

Note, 2026-10-08: the first `neon` body, `#00d977`, measured 1.44 against the head — a
pass, but thinner than `clasico`'s 1.59 in the one skin where the head's bloom (18) bleeds
onto the neck. It was dropped for `#00c46c` before writing, which widens the pair to 1.76.
In `retro`, SNAKE uses only the even rungs of the shared amber ramp (6, 4, 2), so no SNAKE
pair sits on the 1.31–1.33 margins ASTEROIDES lives with.

Glow (blur radius, canvas units) — `head` / `body` / `fruit`: `clasico` 12 / 0 / 14 (today's
literals in `entities.ts` line 184 and `sprites.ts` line 108), `neon` 18 / 6 / 20, `retro`
6 / 0 / 6.

### BLOQUE BUSTER

Measured 2026-10-08, same formula, each colour against its own skin's background, which are
the same three as ASTEROIDES. The highlight strip is the cartridge's only structural element;
it is an `rgba()` painted on top of the paddle and of every block face, so it was composited
over each face and measured against that face — the table keeps the highest of each skin.

Which block colours share a frame is read from `LEVELS` in `constants.ts`: patterns 1 and 4
use six colours without `gray`, pattern 2 six without `red`, patterns 3 and 5 two each. So
**`red` / `gray` is the only pair that never coexists**, and it is the only pair a skin may
merge. That is what makes `retro` possible at all: seven luminance rungs 1.3:1 apart above a
4.5:1 floor would need 4.5 × 1.3⁶ = 21.7:1 at the top, and pure white on pure black is 21:1.

Two pairs are exempt in every skin, by design and not by luck: **paddle / `cyan` block**
(the same token in `clasico`; the paddle lives at y 560 and the last block row ends at
y 224, so they never touch), and **ball / brightest block**, which no skin can separate by
luminance once seven blocks occupy the ramp — the ball is a moving 16 px disc against
64 × 24 rectangles, and `clasico` already relies on that shape cue for ball / `gray`
(1.29, 14°).

| Cartridge     | Skin      | Element                       | Against      | Ratio | Bar        | Result                                              |
| ------------- | --------- | ----------------------------- | ------------ | ----- | ---------- | --------------------------------------------------- |
| BLOQUE BUSTER | `clasico` | paddle `#00f5ff`              | bg `#0a0a0f` | 14.58 | floor      | pass                                                |
| BLOQUE BUSTER | `clasico` | ball `#e6e9ff`                | bg `#0a0a0f` | 16.43 | floor      | pass                                                |
| BLOQUE BUSTER | `clasico` | red `#d97a3a`                 | bg `#0a0a0f` | 6.39  | floor      | pass                                                |
| BLOQUE BUSTER | `clasico` | yellow `#f5ff00`              | bg `#0a0a0f` | 18.05 | floor      | pass                                                |
| BLOQUE BUSTER | `clasico` | cyan `#00f5ff`                | bg `#0a0a0f` | 14.58 | floor      | pass                                                |
| BLOQUE BUSTER | `clasico` | magenta `#ff006e`             | bg `#0a0a0f` | 5.15  | floor      | pass — the tightest value of the cartridge          |
| BLOQUE BUSTER | `clasico` | hotpink `#ffcf3a`             | bg `#0a0a0f` | 13.39 | floor      | pass                                                |
| BLOQUE BUSTER | `clasico` | green `#00ff88`               | bg `#0a0a0f` | 14.73 | floor      | pass                                                |
| BLOQUE BUSTER | `clasico` | gray `#c7d0e0`                | bg `#0a0a0f` | 12.72 | floor      | pass                                                |
| BLOQUE BUSTER | `clasico` | cyan / green                  | each other   | 1.01  | separation | pass by hue: 30.35° — 0.35° of margin               |
| BLOQUE BUSTER | `clasico` | hotpink / gray                | each other   | 1.05  | separation | pass by hue: 173°                                   |
| BLOQUE BUSTER | `clasico` | cyan / gray                   | each other   | 1.15  | separation | pass by hue: 36°                                    |
| BLOQUE BUSTER | `clasico` | red / magenta                 | each other   | 1.24  | separation | pass by hue: 50°                                    |
| BLOQUE BUSTER | `clasico` | yellow / hotpink              | each other   | 1.35  | separation | pass by luminance (hue only 17° apart)              |
| BLOQUE BUSTER | `clasico` | red / hotpink                 | each other   | 2.10  | separation | pass by luminance (hue only 21° apart)              |
| BLOQUE BUSTER | `clasico` | paddle / ball                 | each other   | 1.13  | separation | pass by hue: 50°                                    |
| BLOQUE BUSTER | `clasico` | ball / gray                   | each other   | 1.29  | separation | exempt — shape, see above; fails both measures       |
| BLOQUE BUSTER | `clasico` | paddle / cyan                 | each other   | 1.00  | separation | exempt — same token, never in the same region        |
| BLOQUE BUSTER | `clasico` | strip `rgba(255,255,255,0.12)` over red → `#de8a52` | red | 1.16 | ceiling | pass — highest strip of the skin            |
| BLOQUE BUSTER | `neon`    | paddle `#00ffff`              | bg `#05050c` | 16.21 | floor      | pass                                                |
| BLOQUE BUSTER | `neon`    | ball `#f2f5ff`                | bg `#05050c` | 18.66 | floor      | pass                                                |
| BLOQUE BUSTER | `neon`    | red `#ff6a1a`                 | bg `#05050c` | 7.09  | floor      | pass                                                |
| BLOQUE BUSTER | `neon`    | yellow `#ffff1a`              | bg `#05050c` | 18.94 | floor      | pass                                                |
| BLOQUE BUSTER | `neon`    | cyan `#00ffff`                | bg `#05050c` | 16.21 | floor      | pass                                                |
| BLOQUE BUSTER | `neon`    | magenta `#ff2d95`             | bg `#05050c` | 5.87  | floor      | pass — same lift as asteroides/neon powerUp         |
| BLOQUE BUSTER | `neon`    | hotpink `#ffb300`             | bg `#05050c` | 11.32 | floor      | pass                                                |
| BLOQUE BUSTER | `neon`    | green `#00ff66`               | bg `#05050c` | 14.99 | floor      | pass                                                |
| BLOQUE BUSTER | `neon`    | gray `#d0dcff`                | bg `#05050c` | 14.87 | floor      | pass                                                |
| BLOQUE BUSTER | `neon`    | green / gray                  | each other   | 1.01  | separation | pass by hue: 81°                                    |
| BLOQUE BUSTER | `neon`    | cyan / green                  | each other   | 1.08  | separation | pass by hue: 36° — widened from clasico's 30.35°    |
| BLOQUE BUSTER | `neon`    | cyan / gray                   | each other   | 1.09  | separation | pass by hue: 45°                                    |
| BLOQUE BUSTER | `neon`    | red / magenta                 | each other   | 1.21  | separation | pass by hue: 51°                                    |
| BLOQUE BUSTER | `neon`    | red / hotpink                 | each other   | 1.60  | separation | pass by luminance (hue only 21° apart)              |
| BLOQUE BUSTER | `neon`    | yellow / hotpink              | each other   | 1.67  | separation | pass by luminance (hue only 18° apart)              |
| BLOQUE BUSTER | `neon`    | paddle / ball                 | each other   | 1.15  | separation | pass by hue: 46°                                    |
| BLOQUE BUSTER | `neon`    | ball / yellow                 | each other   | 1.02  | separation | pass by hue: 166° (and exempt by shape regardless)  |
| BLOQUE BUSTER | `neon`    | paddle / cyan                 | each other   | 1.00  | separation | exempt — same token, never in the same region        |
| BLOQUE BUSTER | `neon`    | strip `rgba(255,255,255,0.16)` over red → `#ff823f` | red | 1.16 | ceiling | pass — highest strip of the skin            |
| BLOQUE BUSTER | `retro`   | ball `#fff3da`                | bg `#0b0802` | 18.18 | floor      | pass — rung 6                                       |
| BLOQUE BUSTER | `retro`   | yellow `#fff3da`              | bg `#0b0802` | 18.18 | floor      | pass — rung 6, clasico's brightest block             |
| BLOQUE BUSTER | `retro`   | green `#ffd069`               | bg `#0b0802` | 13.79 | floor      | pass — rung 5                                       |
| BLOQUE BUSTER | `retro`   | paddle `#f8ac00`              | bg `#0b0802` | 10.38 | floor      | pass — rung 4, the cyan block's rung as in clasico   |
| BLOQUE BUSTER | `retro`   | cyan `#f8ac00`                | bg `#0b0802` | 10.38 | floor      | pass — rung 4                                       |
| BLOQUE BUSTER | `retro`   | hotpink `#d99600`             | bg `#0b0802` | 7.92  | floor      | pass — rung 3                                       |
| BLOQUE BUSTER | `retro`   | red `#bb8100`                 | bg `#0b0802` | 5.96  | floor      | pass — rung 2, shared with gray                      |
| BLOQUE BUSTER | `retro`   | gray `#bb8100`                | bg `#0b0802` | 5.96  | floor      | pass — rung 2, shared with red                       |
| BLOQUE BUSTER | `retro`   | magenta `#a06f00`             | bg `#0b0802` | 4.54  | floor      | pass — rung 1, 0.04 over the floor                   |
| BLOQUE BUSTER | `retro`   | cyan / hotpink                | each other   | 1.31  | separation | pass by luminance — 0.01 of margin                   |
| BLOQUE BUSTER | `retro`   | red / magenta                 | each other   | 1.31  | separation | pass by luminance — 0.01 of margin                   |
| BLOQUE BUSTER | `retro`   | magenta / gray                | each other   | 1.31  | separation | pass by luminance — 0.01 of margin                   |
| BLOQUE BUSTER | `retro`   | yellow / green                | each other   | 1.32  | separation | pass by luminance                                    |
| BLOQUE BUSTER | `retro`   | cyan / green                  | each other   | 1.33  | separation | pass by luminance                                    |
| BLOQUE BUSTER | `retro`   | red / hotpink                 | each other   | 1.33  | separation | pass by luminance                                    |
| BLOQUE BUSTER | `retro`   | hotpink / gray                | each other   | 1.33  | separation | pass by luminance                                    |
| BLOQUE BUSTER | `retro`   | hotpink / green               | each other   | 1.74  | separation | pass by luminance                                    |
| BLOQUE BUSTER | `retro`   | red / cyan                    | each other   | 1.74  | separation | pass by luminance                                    |
| BLOQUE BUSTER | `retro`   | cyan / gray                   | each other   | 1.74  | separation | pass by luminance                                    |
| BLOQUE BUSTER | `retro`   | magenta / hotpink             | each other   | 1.74  | separation | pass by luminance                                    |
| BLOQUE BUSTER | `retro`   | yellow / cyan                 | each other   | 1.75  | separation | pass by luminance                                    |
| BLOQUE BUSTER | `retro`   | cyan / magenta                | each other   | 2.28  | separation | pass by luminance                                    |
| BLOQUE BUSTER | `retro`   | yellow / hotpink              | each other   | 2.30  | separation | pass by luminance                                    |
| BLOQUE BUSTER | `retro`   | red / green                   | each other   | 2.32  | separation | pass by luminance                                    |
| BLOQUE BUSTER | `retro`   | green / gray                  | each other   | 2.32  | separation | pass by luminance                                    |
| BLOQUE BUSTER | `retro`   | magenta / green               | each other   | 3.04  | separation | pass by luminance                                    |
| BLOQUE BUSTER | `retro`   | red / yellow                  | each other   | 3.05  | separation | pass by luminance                                    |
| BLOQUE BUSTER | `retro`   | yellow / gray                 | each other   | 3.05  | separation | pass by luminance                                    |
| BLOQUE BUSTER | `retro`   | yellow / magenta              | each other   | 4.00  | separation | pass by luminance                                    |
| BLOQUE BUSTER | `retro`   | red / gray                    | each other   | 1.00  | separation | exempt — never coexist (red: patterns 1, 4; gray: 2) |
| BLOQUE BUSTER | `retro`   | paddle / ball                 | each other   | 1.75  | separation | pass by luminance — two rungs apart                  |
| BLOQUE BUSTER | `retro`   | paddle / hotpink              | each other   | 1.31  | separation | pass by luminance (and never in the same region)     |
| BLOQUE BUSTER | `retro`   | ball / green                  | each other   | 1.32  | separation | pass by luminance                                    |
| BLOQUE BUSTER | `retro`   | ball / yellow                 | each other   | 1.00  | separation | exempt — shape; no rung exists above rung 6          |
| BLOQUE BUSTER | `retro`   | paddle / cyan                 | each other   | 1.00  | separation | exempt — same rung, never in the same region         |
| BLOQUE BUSTER | `retro`   | strip `rgba(255,243,218,0.12)` over magenta → `#ab7f1a` | magenta | 1.21 | ceiling | pass — highest strip of the skin   |

All 20 coexisting block pairs of `retro` are listed above, and every one is ≥ 1.31:1 on hue
41–42°: the separation is luminance alone. `retro` reuses the six-rung ramp of
ASTEROIDES' `retro` unchanged — one phosphor across the Vault — and maps the rungs in
`clasico`'s own luminance order (yellow > green > cyan > hotpink > red/gray > magenta), so a
wall keeps its hierarchy between skins. With the endpoints fixed at 4.54 and 18.18, an evenly
re-spaced ramp would only reach 1.32 per step, so the 0.01 margins were kept rather than
diverge from ASTEROIDES for 0.01. The `clasico` and `neon` pairs not listed are wider than
the ones shown and were checked in the same run (all 21 per skin).

Glow (blur radius, px of `shadowBlur`) — `paddle` / `ball` / `block`: `clasico` 14 / 10 / 6
(today's `GLOW`, `constants.ts` line 75), `neon` 22 / 16 / 10, `retro` 6 / 6 / 3. `block`
also drives the explosion outline, as `GLOW.block` does today. `retro` keeps the block blur
at 3 because blocks sit 2 px apart and the rungs are only 1.31:1 apart: a wider halo would
wash a bright row over its neighbour.

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
| Same three changes for the other engines                                              | `app/lib/engines/{caida,bloque-buster,snake}/`                        | blocked: those three have no `skins.ts` — 2026-10-08: `bloque-buster` and `snake` unblocked, see their rows below; only `caida` stays blocked |
| Leaked literal: fruit halo painted `rgba(255, 0, 110, 0.35)` / `…, 0)` by hand        | `app/lib/engines/snake/entities.ts` lines 255–256                     | done (2026-10-08) — both stops are `withAlpha(palette.halo, 0.35)` / `withAlpha(palette.halo, 0)`; for `#ff006e` that yields the very same `rgba(255, 0, 110, …)` strings |
| Leaked literal: head glow radius written as a bare `12`                               | `app/lib/engines/snake/entities.ts` line 184                          | done (2026-10-08) — `Snake.draw` passes `palette.glow.head` to the head and `palette.glow.body` to the body; `withGlow()` keeps its save/restore |
| SNAKE: third parameter `skin: SkinId = DEFAULT_SKIN` on `createSnakeEngine`, `palette = SKINS[skin]` | `app/lib/engines/snake/engine.ts`                      | done (2026-10-08) — `palette` is declared before `createFruitSheet()`, so a cached sheet resolving synchronously still finds it; the loading gate is unchanged |
| SNAKE: `setSkin()` on its `EngineHandle`; repaints a live engine, never re-creates it  | `app/lib/engines/snake/engine.ts`                                    | done (2026-10-08) — repaints when the loop is stopped (ready, paused, over), as in ASTEROIDES |
| SNAKE: `drawGrid(ctx, palette)`, `Snake.draw(ctx, palette)`, `Food.draw(ctx, painter, palette)` instead of importing `PALETTE` | `app/lib/engines/snake/entities.ts` | done (2026-10-08) — no file under `snake/` imports `PALETTE` any more; it stays in `constants.ts` as the reference `clasico` is checked against, as in ASTEROIDES |
| SNAKE: third leak, not listed in SPEC 10 — `drawVectorFruit` imports `PALETTE.halo` and writes `shadowBlur = 14` by hand; the fallback fruit stays magenta in every skin until it takes `palette.halo` / `palette.glow.fruit` (e.g. through `FoodPainter.draw`) | `app/lib/engines/snake/sprites.ts` lines 12, 107–109 | done (2026-10-08) — `FoodPainter.draw` / `FruitSheet.draw` take the palette and hand it to `drawVectorFruit`, which paints `palette.halo` at `shadowBlur = palette.glow.fruit`. The sprite PNG itself is still drawn as-is in every skin: a known limit, not a leak |
| SNAKE: opt in to `.gp-themer` — read `useSkin()`, pass it to the factory, second `useEffect` on `skin` calling `handle.setSkin()`, mounting effect keeps its empty array, pass `skin` + `onSkinChange` to `PlayerShell` | `app/components/snake-game.tsx` | done (2026-10-08) — same shape as `asteroides-game.tsx`; the `[skin]` effect is declared before the mount effect |
| `GLOW = { paddle: 14, ball: 10, block: 6 }` belongs to the skin, not to the tuning    | `app/lib/engines/bloque-buster/constants.ts` line 75                  | done (2026-10-08) — `GLOW` deleted; `withGlow()` calls and `Explosion.draw` read `palette.glow.*`. `PALETTE` stays in `constants.ts`, unread, as the reference `clasico` is checked against (same as ASTEROIDES) |
| BLOQUE BUSTER: third parameter `skin: SkinId = DEFAULT_SKIN` on `createBloqueBusterEngine`, `palette = SKINS[skin]`, used for the frame clear (`engine.ts` line 310) | `app/lib/engines/bloque-buster/engine.ts` | done (2026-10-08) |
| BLOQUE BUSTER: `setSkin()` on its `EngineHandle`; repaints a live engine, never re-creates it | `app/lib/engines/bloque-buster/engine.ts`                    | done (2026-10-08) — repaints when `rafId === null` (ready, paused, over) |
| BLOQUE BUSTER: `Paddle.draw`, `Ball.draw`, `Block.draw`, `Explosion.draw` take `(ctx, palette)` instead of importing `PALETTE` and `GLOW`; `highlight` too, it is painted on paddle and blocks | `app/lib/engines/bloque-buster/entities.ts` lines 100–105, 173–174, 226–236, 284–286 | done (2026-10-08) |
| BLOQUE BUSTER: `Explosion` freezes its colour in the constructor (`this.color = PALETTE.blocks[block.color]`, line 263). Keep the `BlockColor` name instead and resolve it in `draw(ctx, palette)`, or a skin change leaves up to 0.15 s of flashes in the old skin | `app/lib/engines/bloque-buster/entities.ts` line 263 | done (2026-10-08) — stores the `BlockColor` name, resolved in `draw()` |
| BLOQUE BUSTER: opt in to `.gp-themer` — read `useSkin()`, pass it to the factory, second `useEffect` on `skin` calling `handle.setSkin()`, mounting effect keeps its empty array, pass `skin` + `onSkinChange` to `PlayerShell` | `app/components/bloque-buster-game.tsx` (mount effect at line 114) | done (2026-10-08) |
| BLOQUE BUSTER: SPEC 10's criterion "los siete bloques … se distinguen entre sí" in `retro` cannot hold literally — `red` and `gray` share rung 2 because they never share a level. The honest check is "every pair that coexists in one pattern" | `specs/10-costura-de-skins.md` section 5 | pending — to be reworded by whoever writes the follow-up spec |
| `skins.ts` still missing for `caida`, `bloque-buster` and `snake`                     | `app/lib/engines/<game>/skins.ts`                                     | next `skin-designer` run — 2026-10-08: `bloque-buster` and `snake` written; only `caida` still missing |

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
