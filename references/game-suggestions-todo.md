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

## The cover budget

Checked against `pg_constraint` on 2026-09-09: there is **no unique index on `cover` or on
`sort_order`**, only `games_cover_check` over the eight `cover-*` class names. Two
consequences, and earlier notes in this file that said "a ninth cover is required" were
overstating the constraint:

- A new seed row **may legally reuse an existing cover class**. The cost is visual — two
  identical cards in `/games` — not a schema change.
- A cover of its own is what costs three coordinated changes: an `alter table` on the
  `CHECK`, a `.cover-*` rule in `app/globals.css` (under the `NOT PART OF THE PORT`
  banner, since the file is a literal port) and a new member of the `CoverArt` union in
  `app/lib/games.ts` — a file `/add-game` otherwise never touches, so the spec has to
  justify the exception.

The four seeded rows below need neither. That is most of why they keep winning.

## Propuesto

### Rows that already exist in `public.games`

id, `cat`, `cover` and `color` are seeded and already pass the `CHECK` constraints, but
`/games/[id]/play` still mounts `fake-game-player.tsx`. They are the cheapest next
cartridge there is: no new seed row, no cover work, and the only migration is tightening
`max_score`, which all four still carry at the seeded 10 000 000 (confirmed against
`public.games` on 2026-09-09).

| Game            | Id            | cat     | cover          | color  | Div.  | 2D   | Clásico | Suggested on | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------- | ------------- | ------- | -------------- | ------ | ----- | ---- | ------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **INVASORES**   | `invasores`   | SHOOTER | cover-invaders | green  | Media | Alta | Alta    | 2026-09-09   | Space Invaders. SHOOTER has only `asteroides`. Formation movement and a descending wave are plain 2D canvas; the shot/enemy grid is the whole engine. **2026-09-09: recommended as the fifth cartridge.** Chosen over `duelo-pixel` because it needs no platform decision first, and over `gloton`/`ranaria` because ARCADE is already the fullest category. No binary assets, no audio, no cover work; migration is `max_score` only. Watch the ceiling: per-row points plus a UFO bonus add up fast in an endless game, so compute it in the spec the way SNAKE's 27 450 was computed.        |
| **DUELO PIXEL** | `duelo-pixel` | VERSUS  | cover-duelo    | cyan   | Alta  | Alta | Alta    | 2026-09-09   | The only VERSUS row, so it is the one that adds a category. **2026-09-09 (first pass): deferred** — the leaderboard stores one integer per run (SPEC 06) and two local players produce two. **2026-09-09 (VERSUS bucket): unblocked by design, no longer deferred.** Single-player vs CPU produces one integer per run (rallies won × level; three CPU points spend the three `lives` and end it), so SPEC 06 needs no change and 2P local stays out of scope — the `short` ("Dos paletas. Una pelota.") still holds, the CPU moves one of them. Risk moves to the AI: cap its speed below the ball's or the run never ends. |
| **GLOTÓN**      | `gloton`      | ARCADE  | cover-glot     | yellow | Baja  | Alta | Alta    | 2026-09-09   | Pac-Man. ARCADE is already the fullest category (2 of the 4 playable). No assets needed — a tile maze drawn with `:root` tokens, centred with empty gutters the way CAÍDA does it — but ghost AI is the most engine work of the four. **2026-09-09: runner-up, re-scored in the ARCADE bucket and unchanged.** Likely wants a fourth engine file (`maze.ts`) for the map; the flee/fruit states multiply the state machine.                                                                                                                                                                    |
| **RANARIA**     | `ranaria`     | ARCADE  | cover-rana     | green  | Baja  | Alta | Alta    | 2026-09-09   | Frogger. ARCADE again. Lane traffic plus logs and a timer, AABB collisions, no continuous collision and no AI; the cheapest engine of the four. **2026-09-09: runner-up, re-scored in both the ARCADE and the reflex/precision buckets — top of ARCADE, second of VERSUS/sports.** The per-life timer fits the single spare HUD slot (`TIEMPO`), like `LÍNEAS`/`BLOQUES`, so it does not touch `PlayerShell`. Its real risk is thinness: without a per-level difficulty curve it is exhausted in two runs.                                                                                       |

### Candidates that would need a new seed row

Sixteen rows, scored on 2026-09-09 across four themed buckets (SHOOTER, PUZZLE, ARCADE,
VERSUS/sports). None of them has a row in `public.games`, so each costs an `insert` on top
of the usual engine folder, component and `GAME_ENGINES` entry — plus either a reused cover
class or the three-change cover of its own described above. `minas` is listed here for
comparison only; its record stays in `Rechazado`, which is why the four seeded rows plus
these come to twenty distinct games considered.

| Game             | Suggested id   | cat     | Div.  | 2D    | Clásico | Suggested on | Notes                                                                                                                                                                                                                                                                                                                                        |
| ---------------- | -------------- | ------- | ----- | ----- | ------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MISILES**      | `misiles`      | SHOOTER | Media | Alta  | Media   | 2026-09-09   | Missile Command. **Best of the SHOOTER bucket.** The only candidate there with a different verb — you defend, you do not pilot — so it does not compete with ASTEROIDES or INVASORES. Mouse aiming already has a precedent in `bloque-buster` (canvas listener + live `getBoundingClientRect()`, removed in `destroy()`); explosions are growing circles and the chain reaction is a distance test. No original in `references/started-games/`, so every number is a spec decision, as in SPEC 09. |
| **BURBUJAS**     | `burbujas`     | PUZZLE  | Media | Alta  | Alta    | 2026-09-09   | Puzzle Bobble. **Best of the PUZZLE bucket.** Static hex grid plus one projectile, no continuous collision, no assets; mouse-aimed cannon on the `bloque-buster` pattern. Native integer score (bubbles popped + dropped clusters × level). Its cost is engine, not platform: flood-fill cluster detection plus orphan bubbles is the heaviest `entities.ts` of its bucket.                                                                                        |
| **CIEMPIÉS**     | `ciempies`     | SHOOTER | Baja  | Alta  | Media   | 2026-09-09   | Centipede. Structurally SNAKE with a gun: mushroom grid, segments that descend at the edge, player pinned to the bottom band. Keyboard only, no continuous collision. Buildable today with zero pending decisions; loses on recognition in a Spanish-language catalogue and on a dense `entities.ts` (splitting on a mid-body hit, mushroom health). Cut it explicitly to centipede + mushrooms or the spec grows by accretion. |
| **CARRERA NEÓN** | `carrera-neon` | ARCADE  | Baja  | Alta  | Media   | 2026-09-09   | Top-down endless road racer (Road Fighter / Spy Hunter). Scrolling road, rival cars per lane, full 800×600 world, all primitives and `:root` tokens. Score = distance/100 + overtakes, a clean monotonic integer. Loses because it pays for a new row to reinforce the fullest category; the genre reads from the card, the title does not.       |
| **TANQUES**      | `tanques`      | SHOOTER | Baja  | Alta  | Media   | 2026-09-09   | Battle City / Combat. Destructible brick grid, four directions, simple chase AI, all primitives. Highest ceiling of the SHOOTER bucket **as VERSUS** — the empty category — but that version needs two local scores, so only the single-player base-defence version is speccable today, and that version adds no diversity. Reusing `duelo-pixel` for the VERSUS variant would mean delete+insert, the way SPEC 09 replaced `serpentina`.                          |
| **PATOS**        | `patos`        | SHOOTER | Baja  | Alta  | Alta    | 2026-09-09   | Duck Hunt-style shooting gallery. The cheapest engine of its bucket: sinusoidal paths, no entity-to-entity collision, just point-in-rect on click. First time the mouse *fires* rather than moves — still inside engine rule 1. Drawn with primitives it looks poor beside the other cards; with a sprite it stops being the cheap candidate and takes the SPEC 09 loading gate. A gallery has no natural death, so the end condition (timer or misses) must be invented. |
| **HOCKEY NEÓN**  | `hockey-neon`  | VERSUS  | Alta  | Alta  | Media   | 2026-09-09   | Air hockey vs CPU. Opens VERSUS like `duelo-pixel` and scores the same way (goals × level, five conceded ends the run), mouse mallet on the `bloque-buster` pattern with `MAX_DT` 0.02. But it repeats the paddle-and-ball mechanic while also paying for a new row and cover. **Only worth speccing if `duelo-pixel` is dropped.**              |
| **TREPADOR**     | `trepador`     | ARCADE  | Baja  | Media | Alta    | 2026-09-09   | Donkey Kong / single-screen platformer. First-rate classic, but sloped girders plus ladders plus rolling barrels means solving ramps by hand with no physics library, and it pays for a new row on top. The precedent of SPEC 07/08 says repaint with primitives rather than import a character spritesheet — that is the temptation to watch.     |
| **MINAS**        | `minas`        | PUZZLE  | Media | Alta  | Alta    | 2026-09-09   | Minesweeper. **Rejected 2026-09-09, then partially revived the same day** — see `Rechazado`, where the row and the full reasoning stay. One of its two objections has an answer (score = cells revealed × difficulty + time-remaining bonus is an integer), the cover-budget one does not.                                                       |
| **EXCAVADOR**    | `excavador`    | ARCADE  | Baja  | Media | Media   | 2026-09-09   | Dig Dug. Destructible terrain as a tile mask is direct, but enemy pathfinding through tunnels and the ghosting-through-dirt state are not trivial, and the falling rock mixes terrain with gravity — half the scoring depends on it, so it cannot simply be cut. Wants a fourth engine file (`terrain.ts`). Medium recognition for a new row.     |
| **COLUMNAS**     | `columnas`     | PUZZLE  | Baja  | Alta  | Media   | 2026-09-09   | Columns. The cheapest build of the PUZZLE bucket — the 300×600 well centred at `x: 250` is already proven in `caida/` — and that is exactly the problem: same silhouette, same gravity-well feel, two near-identical cards in a catalogue of eight. Perfect integer score, near-zero added variety.                                              |
| **SALTARÍN**     | `saltarin`     | ARCADE  | Baja  | Alta  | Media   | 2026-09-09   | Q*bert. Isometric projection over a logical grid, 28 cubes, primitives only, fits 800×600 comfortably — the cheapest of the new ARCADE rows to build. Held back by medium recognition and by a control problem: the jumps are diagonal and the Vault's keyboard is four arrows, so the mapping is a spec decision that must reach the controls bar. |
| **SIMÓN**        | `simon`        | PUZZLE  | Media | Alta  | Alta    | 2026-09-09   | Simon (1978). The simplest engine possible — four quadrants, no collisions, no real `dt` — and a genuine classic. **Its score is the round reached: ~5–25 discrete values.** `getLeaderboard` orders by `score desc`, so the Hall of Fame fills with ties. Produces an integer and still fits the leaderboard worst of its bucket. Per-pad tones are possible via WebAudio with no binary asset, but inherit the SPEC 08 note: platform audio is still its own unbuilt spec. |
| **DESLIZANTE**   | `deslizante`   | PUZZLE  | Media | Alta  | Baja    | 2026-09-09   | 2048. The best possible fit with SPEC 06 — its native score is the sum of merges, an integer with wide range — and a cheap 4×4 keyboard-only build. It loses on identity: a 2014 browser game in a neon vault of 1980s cartridges. Note the trap in the alternative: the classic 15-puzzle inverts the problem into a moves/time metric that `submitScore` cannot take. |
| **GALAXIA**      | `galaxia`      | SHOOTER | Baja  | Alta  | Alta    | 2026-09-09   | Galaga / Galaxian. Best recognition of the SHOOTER bucket and the worst catalogue move: same board, same natural cover (`cover-invaders`), same feel as INVASORES, which is already queued. **Cannibalises the recommended cartridge** — reconsider only if INVASORES is dropped.                                                                |
| **VELOCISTA**    | `velocista`    | ARCADE  | Baja  | Media | Media   | 2026-09-09   | Track & Field-style dash/hurdles. **Its natural metric is time, not a score** — the same objection that rejected `minas` — and converting it (`points = 100000 − ms`) is arbitrary. Also key-mashing fights the browser's key repeat and is the worst of any candidate on accessibility, and the runner is the one sprite the repo cannot draw with primitives convincingly. Weakest of the twenty. |

Playable category counts recomputed from the live catalogue on 2026-09-09: ARCADE ×2,
PUZZLE ×1, SHOOTER ×1, VERSUS ×0 — counting only ids present in `GAME_ENGINES`, not rows.
Note that once INVASORES ships, SHOOTER is ×2 and PUZZLE becomes the lowest non-empty
category, which promotes the PUZZLE bucket for the *sixth* cartridge rather than the fifth.

None of the twenty candidates needs network, and none needs audio: platform audio remains
unbuilt (no remembered mute, no `PlayerShell` control), so a candidate that wants sound is
asking for its own spec first.

## Rechazado

| Game            | Suggested id  | Reason                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Rejected on |
| --------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **MINAS**       | `minas`       | Minesweeper. Would balance PUZZLE and is trivially 2D, but it was rejected on two counts: it needs cover work, and its natural metric is time rather than an integer score. **Reconsidered 2026-09-09 (PUZZLE bucket): one of the two objections falls, the other stands.** The metric has an answer — score = cells revealed × difficulty multiplier + a bonus for time remaining is one integer per run — but there is still no cover budget, so reviving it means accepting that cost, not avoiding it. Its engine is the cheapest of its bucket (a grid, no physics loop). Open questions if it ever comes back: `contextmenu` on the canvas for flags (`preventDefault` scoped to the canvas, as in SPEC 08), a *winnable* run in a shell that models the end as `over`, and first-click-safe generation. | 2026-09-09  |
| **PONG ONLINE** | `pong-online` | Two-machine Pong over the network. Fails the SPEC 05 engine contract outright: the engine knows no DOM beyond its own canvas and there is no realtime transport in the stack. Not a game problem, an infrastructure one.                                                                                                                                                                                                                                                                                                                                                                                                    | 2026-09-09  |

## Implementado

| Game              | Id              | Spec                           | Category | Shipped    |
| ----------------- | --------------- | ------------------------------ | -------- | ---------- |
| **ASTEROIDES**    | `asteroides`    | `specs/05-juego-asteroides.md` | SHOOTER  | 2026-09-04 |
| **CAÍDA**         | `caida`         | `specs/07-juego-tetris.md`     | PUZZLE   | 2026-09-04 |
| **BLOQUE BUSTER** | `bloque-buster` | `specs/08-juego-arkanoid.md`   | ARCADE   | 2026-09-04 |
| **SNAKE**         | `snake`         | `specs/09-juego-snake.md`      | ARCADE   | 2026-09-04 |

`snake` is the one that did not take an existing row unchanged: SPEC 09 replaced the seeded
`serpentina` with it.
