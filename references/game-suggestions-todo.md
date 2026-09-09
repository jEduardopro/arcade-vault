# Game suggestions — To Do

Every game idea that has been considered for the Vault, and what was decided about it.
Maintained by the `game-planner` agent (`.claude/agents/game-planner.md`): it reads this
file before proposing anything and writes to it before answering. Rows are never deleted —
a discarded idea moves to `Rechazado` with its reason, so the same idea does not come back
next month by accident.

Three columns score every candidate, `Alta` / `Media` / `Baja`:

- **Div.** — category diversity: does it fill an under-represented `cat`?
- **2D** — canvas feasibility against the SPEC 05 engine contract: a fixed 800×600 world,
  keyboard and mouse only, no network, few or no binary assets.
- **Clásico** — recognition: would a player know the game from the card?

The companion file is `references/implemented-games.md`, which describes what has been
built. This one describes what has been considered. Neither is `@`-imported: read them
when the question is a game.

Last updated: 2026-09-09.

## Propuesto

The four rows below already exist in `public.games` — id, `cat`, `cover` and `color` are
seeded and already pass the `CHECK` constraints — but `/games/[id]/play` still mounts
`fake-game-player.tsx`. They are the cheapest fifth cartridge there is: no new seed row, no
new cover art, and the only migration is tightening `max_score`, which all four still carry
at the seeded 10 000 000.

| Game            | Id            | cat     | cover          | color  | Div.  | 2D   | Clásico | Suggested on | Notes                                                                                                                                     |
| --------------- | ------------- | ------- | -------------- | ------ | ----- | ---- | ------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **DUELO PIXEL** | `duelo-pixel` | VERSUS  | cover-duelo    | cyan   | Alta  | Alta | Alta    | 2026-09-09   | The only VERSUS row, so it is the one that adds a category. **But the leaderboard stores one integer per run** (SPEC 06) and two local players produce two — that has to be resolved before it can be specced. |
| **INVASORES**   | `invasores`   | SHOOTER | cover-invaders | green  | Media | Alta | Alta    | 2026-09-09   | Space Invaders. SHOOTER has only `asteroides`. Formation movement and a descending wave are plain 2D canvas; the shot/enemy grid is the whole engine.                                                          |
| **GLOTÓN**      | `gloton`      | ARCADE  | cover-glot     | yellow | Baja  | Alta | Alta    | 2026-09-09   | Pac-Man. ARCADE is already the fullest category. No assets needed — a tile maze drawn with `:root` tokens — but ghost AI is the most engine work of the four.                                                  |
| **RANARIA**     | `ranaria`     | ARCADE  | cover-rana     | green  | Baja  | Alta | Alta    | 2026-09-09   | Frogger. ARCADE again. Lane traffic plus a timer, no collision subtleties; the cheapest engine of the four.                                                                                                    |

Seeded on 2026-09-09 from `public.games` and `references/implemented-games.md`. No one has
recommended one yet — the scores above are the starting read, not a decision.

## Rechazado

| Game      | Suggested id | Reason | Rejected on |
| --------- | ------------ | ------ | ----------- |
| _(empty)_ | —            | —      | —           |

## Implementado

| Game              | Id              | Spec                            | Category | Shipped    |
| ----------------- | --------------- | ------------------------------- | -------- | ---------- |
| **ASTEROIDES**    | `asteroides`    | `specs/05-juego-asteroides.md`  | SHOOTER  | 2026-09-04 |
| **CAÍDA**         | `caida`         | `specs/07-juego-tetris.md`      | PUZZLE   | 2026-09-04 |
| **BLOQUE BUSTER** | `bloque-buster` | `specs/08-juego-arkanoid.md`    | ARCADE   | 2026-09-04 |
| **SNAKE**         | `snake`         | `specs/09-juego-snake.md`       | ARCADE   | 2026-09-04 |

`snake` is the one that did not take an existing row unchanged: SPEC 09 replaced the seeded
`serpentina` with it. Playable category counts today: ARCADE ×2, PUZZLE ×1, SHOOTER ×1,
VERSUS ×0.
