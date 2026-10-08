# SPEC 10 — DUCKS, the survival take

> **State:** Draft
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-09-09
> **Game jam:** theme «ducks» — variant 2 of 2
> **Goal:** Write from scratch a keyboard-scope duck gallery as the new cartridge `ducks`, where a countdown clock is the only life, every duck downed buys seconds, and a streak multiplies the score up to ×5.

---

## 1 — Why this spec exists

The theme of this jam is **ducks**, and the classic a player recognises behind it is the
shooting gallery: birds cross the sky on weaving paths and you bring them down before they
reach the far side. It is the cheapest engine of the SHOOTER bucket — sinusoidal flight paths,
no entity-to-entity collision, and a single point-in-rect test at the instant of a shot — and
it fits the SPEC 05 contract with no asset, no network and no physics library.

A gallery also has no natural death. Snake bites itself, Tetris tops out, a ship runs out of
lives; ducks just keep coming. **The end of a run is therefore invented here**, and that is the
decision that splits this spec from its sibling.

This is the **survival take**. The sky is an endless stream of ducks at dusk, there are no
lives and no ammunition — what runs out is **time**. It diverges from
`10-game-ducks-arcade.md` on four axes, and two of them are the load-bearing ones:

- **Run ending.** Here a **countdown clock is the whole of the run**: it starts at 45 seconds,
  every duck downed adds 0.8 s, every duck that crosses the sky costs 2.5 s, every shot fired at
  nothing costs 0.4 s, and the run ends the moment the clock reaches zero. The sibling ends on
  the third duck that escapes, with three lives and three shells a flush.
- **Controls.** Here the mouse is never touched: a scope moves with the **arrow keys or WASD**
  at a fixed 520 px/s and the **space bar fires**, so the travel time between two ducks is the
  difficulty. The sibling is mouse-only, the pointer aiming and the click firing.

The other two follow from those. **Scoring** is a streak multiplier — 100 points a duck times
×1 to ×5, one step for every five consecutive hits — where the sibling pays a flat 500 plus a
flush bonus. And the **HUD** shows `—` for lives, a speed tier and `TIME`, where the sibling
shows three hearts, a round number and `SHELLS`.

Two smaller firsts come with this take. It is the **first cartridge whose extra HUD stat changes
several times a second**, which is the first real use of rule 3's clause about rounding a
continuous value before emitting it; and it is the first whose difficulty ramp is a race the
player is guaranteed to lose, which is what gives the score ceiling of section 6 an arithmetic
instead of a guess.

Only one of the two variants is ever promoted, so from here on this document stands alone and
does not mention the sibling again.

What this spec does **not** have to decide is anything about scores or about the player screen:
`PlayerShell`, the saving flow and the leaderboard of SPEC 06 work by themselves the moment the
id exists in `public.games`.

---

## 2 — Scope

**In:**

- A new engine in `app/lib/engines/ducks/`, three files — `constants.ts`, `entities.ts`,
  `engine.ts` — with no React import and no binary asset.
- A fixed 800×600 world, the exact 4:3 of `.crt-screen`, split into a dusk sky band and a grass
  band, drawn entirely with canvas primitives.
- An endless stream of ducks that enter from either side at a random altitude, cross the sky on
  a sinusoidal path, and escape through the far edge.
- A keyboard scope: arrows or WASD at 520 px/s, space bar to fire, a 0.22 s cooldown and
  unlimited ammunition.
- A countdown clock as the only life: 45 s to start, capped at 60 s, +0.8 s a hit, −2.5 s an
  escape, −0.4 s a wasted shot, and `"over"` at zero.
- A streak multiplier from ×1 to ×5, one step every five consecutive hits, reset by a wasted
  shot or an escape, reported inside the canvas as the scope's colour and never as text.
- Ten speed tiers, one every twenty ducks downed, that shorten the spawn interval to a 0.35 s
  floor and raise the flight speed to 471 px/s.
- Flat 100 points a duck before the multiplier.
- The cartridge `app/components/ducks-game.tsx` and its entry in
  `app/components/game-registry.ts`.
- A ninth cover art, `cover-ducks`, with its three coordinated changes: the `CHECK` on
  `public.games.cover`, the `.cover-ducks` rule in `app/globals.css` and the new member of the
  `CoverArt` union in `app/lib/games.ts`.
- A migration that inserts the `ducks` row at `sort_order 8` with `max_score = 200000`, taking
  the catalogue from eight rows to nine.
- The documentation fix: `CLAUDE.md` and `references/implemented-games.md` on how many
  cartridges really play, and on the English naming convention this cartridge starts.

**Out of scope (for future specs):**

- **Sound.** DUCKS is silent. BLOQUE BUSTER stays the only cartridge that makes a noise, and
  platform audio — a remembered mute, a control in `PlayerShell` — is still its own spec.
- **The dog.** No sprite, no cutscene, no laugh. It is the most memorable thing about the
  original and it is pure art budget: it adds nothing to the score loop and this cartridge ships
  no binary asset.
- **The mouse.** This take binds no listener to its canvas at all; aiming with the pointer is a
  different game and it is what the other variant of this jam is.
- **Touch controls.** With a coarse pointer the cartridge shows `KEYBOARD REQUIRED` and does not
  start the engine, the same shape ASTEROIDES uses for `SE REQUIERE TECLADO`.
- **Ammunition, reloading and shells.** The clock is the resource; a second one would need a
  second extra HUD slot, and `PlayerShell` has one.
- **Duck species worth different points, bonus rounds and clay pigeons.** One duck, one price,
  and the multiplier does the rest.
- **Renaming the four shipped cartridges.** `asteroides`, `caida`, `bloque-buster` and `snake`
  keep their Spanish ids, titles and HUD labels. The English convention starts here and does not
  walk backwards.
- **A local record or a board inside the cartridge.** No `localStorage`: the mark is saved
  through `PlayerShell` and the ranking is the one from SPEC 06.

---

## 3 — Data model

### 3.1 — The catalogue row and the ninth cover art

`ducks` is a **new row**, not a replacement. SPEC 09 could take over the `serpentina` slot
because that row promised the very game being built; none of the four rows without an engine —
`gloton`, `invasores`, `ranaria`, `duelo-pixel` — promises a shooting gallery, and each of them
promises a classic that is still queued. `invasores` in particular is the row
`references/game-suggestions-todo.md` recommends as the fifth cartridge, dated 2026-09-09, so
taking its slot would delete a decision made the same day.

That means the catalogue grows to **nine rows** and the game needs a cover, which is the one
expensive part of this spec. `cover` is constrained to eight fixed classes, so a ninth costs
**three coordinated changes** that must land together or the app breaks in three different ways.

**Change 1 — the constraint and the row**, one migration:

```sql
-- supabase/migrations/<timestamp>_add_ducks_cartridge.sql
alter table public.games drop constraint if exists games_cover_check;

alter table public.games add constraint games_cover_check check (cover in (
    'cover-bricks', 'cover-tetro', 'cover-snake', 'cover-glot',
    'cover-invaders', 'cover-rocas', 'cover-rana', 'cover-duelo',
    'cover-ducks'));

insert into public.games (id, title, short, long, cat, cover, color, plays, sort_order, max_score)
values (
    'ducks',
    'DUCKS',
    'Beat the clock. Every duck you drop buys seconds.',
    'Dusk over the marsh, and the flock never stops coming. There are no lives and no shells here: the clock is the run. Every duck you drop buys you eight tenths of a second, every duck that reaches the far side costs you two and a half, and five hits in a row start multiplying what the next one is worth. The sky gets faster every twenty ducks, and it always wins in the end.',
    'SHOOTER', 'cover-ducks', 'magenta', '0', 8, 200000
)
on conflict (id) do nothing;
```

The constraint name is the one Postgres derived from the inline `check` of
`20260904185251_create_games_and_scores.sql`, so confirm it before writing the file:

```sql
select conname from pg_constraint where conrelid = 'public.games'::regclass;
```

The `insert` carries a literal id and `on conflict (id) do nothing`, which is what SPEC 06
requires of every seed: with a random primary key the conflict could never fire and re-applying
would duplicate. The `alter table` is idempotent by way of the `drop constraint if exists`.

**Change 2 — `app/globals.css`.** The file is a verbatim port of
`references/templates/home-about/styles.css`, so the new rule does **not** go beside the other
eight cover generators. It goes at the end, inside the `NOT PART OF THE PORT` banner, in its own
block labelled `SPEC 10`:

```css
/* SPEC 10 — cover art for the DUCKS cartridge. The ninth generator; the eight
   above are part of the port and are not touched. */
.cover-ducks {
    background: linear-gradient(180deg, #2a1400, #0a0a18);
}
.cover-ducks::after {
    content: "";
    position: absolute;
    inset: 0;
    background:
        radial-gradient(
            circle at 24% 32%,
            var(--yellow) 0 5px,
            transparent 6px
        ),
        radial-gradient(
            circle at 45% 22%,
            var(--yellow) 0 5px,
            transparent 6px
        ),
        radial-gradient(
            circle at 63% 38%,
            var(--yellow) 0 5px,
            transparent 6px
        ),
        linear-gradient(var(--magenta), var(--magenta)) 63% 38% / 26px 2px
            no-repeat,
        linear-gradient(var(--magenta), var(--magenta)) 63% 38% / 2px 26px
            no-repeat,
        linear-gradient(180deg, transparent 0 76%, #00291b 76% 100%);
    filter: drop-shadow(0 0 6px rgba(245, 255, 0, 0.5));
}
```

Three yellow ducks over a dusk gradient, a magenta reticle on the last one, and a dark grass
band at the bottom. It follows the shape of the eight it joins: a `background` on the class and
the art in `::after`, positioned by `.cover-bg`.

**Change 3 — `app/lib/games.ts`.** One member added to the `CoverArt` union:

```ts
export type CoverArt =
    | "cover-bricks"
    // …the seven that already exist…
    | "cover-ducks";
```

This is the **only** edit to a never-touch file that a game spec may propose, and it is the one
the `/add-game` contract names explicitly as part of the ninth-cover cost. It adds a string to a
union and changes no behaviour. Nothing else on the list is opened: `player-shell.tsx`,
`game-player.tsx`, `catalogue.ts`, `scores.ts`, `leaderboard.ts`, `app/actions/scores.ts`,
`rate-limit.ts` and the two page routes stay exactly as they are.

`app/lib/supabase/types.ts` is regenerated after the migration and must come out **identical**:
`cover` is typed `string`, and a `CHECK` is not part of the generated types.

The catalogue after the migration:

| column       | value                                             |
| ------------ | ------------------------------------------------- |
| `id`         | `ducks` — matches `^[a-z0-9-]{2,40}$`             |
| `title`      | `DUCKS`                                           |
| `cat`        | `SHOOTER` — the third of the category, after two  |
| `cover`      | `cover-ducks`                                     |
| `color`      | `magenta` — the `JUGAR` button variant            |
| `plays`      | `0` — nobody has played it; the column is display |
| `sort_order` | `8` — last card in the library                    |
| `max_score`  | `200000` — the arithmetic is in section 6         |

`max_score` is the ceiling `app/actions/scores.ts` reads **live** before inserting, with its own
`select` rather than the cached catalogue, so it takes effect without revalidating the `games`
tag. The card itself is cached: `getGames` wraps its read in `unstable_cache` under the `games`
tag, so the ninth card appears once that tag is revalidated — a saved score does it, and so does
restarting the dev server.

### 3.2 — `app/lib/engines/ducks/constants.ts`

There is no `game.js` to copy from, so every number here is a decision of this spec and every
block says where it comes from.

```ts
// 800×600 is the aspect-ratio 4/3 of .crt-screen: .game-canvas covers it and
// app/globals.css needs no letterbox rule.
export const WORLD = { w: 800, h: 600 } as const;

// dt cap. Nothing in this game collides with anything: the only test is
// point-in-rect at the instant of a shot, against the position already on
// screen. At the top tier a duck moves 471 px/s, so a capped frame advances it
// 23 px — under half its width — and BLOQUE BUSTER's 0.02 is unnecessary here.
export const MAX_DT = 0.05;

// The sky band is where ducks fly; the grass is scenery and where a downed duck
// lands. The scope may roam the sky plus a little grass, so a duck crossing low
// is still reachable.
export const FIELD = {
    grassY: 500,
    skyTop: 60,
    laneMin: 90, // highest cruise altitude
    laneMax: 420, // lowest, still 80 px above the grass
} as const;

export const DUCK = {
    w: 56,
    h: 40,
    hitPad: 6, // the box is 68×52: a shot that grazes the wing counts
    bobAmplitude: 40, // px above and below the lane
    bobOmega: 2.2, // rad/s → a 2.9 s weave, so leading the shot matters
    fallSpeed: 420, // px/s down to the grass; cosmetic, the score is resolved
    flapPeriod: 0.18, // seconds per wing frame, 2 frames
    spawnMargin: 56, // spawns one width off screen, so it never pops into view
    maxAlive: 9, // draw-cost bound; a spawn that would exceed it is skipped
} as const;

export const SCOPE = {
    speed: 520, // px/s, and the whole difficulty: 800 px of sky is 1.54 s away
    radius: 16,
    gap: 5,
    cooldown: 0.22, // seconds between shots; unlimited ammunition otherwise
    yMin: 60, // clamped to the sky band plus the top of the grass
    yMax: 520,
} as const;

// The clock is the run. Numbers picked so that a clean patch of play banks
// time, a sloppy one drains it, and an escape costs three hits to undo.
export const CLOCK = {
    start: 45,
    cap: 60, // banked time stops here, or a good player never loses
    perHit: 0.8,
    perEscape: -2.5,
    perWastedShot: -0.4,
    lowWarning: 10, // under this the vignette pulses; no text is drawn
} as const;

// One step every five consecutive hits, ×5 at twenty. Reset by a wasted shot
// or by a duck escaping.
export const STREAK = { step: 5, maxMultiplier: 5 } as const;

// The tier is the difficulty and the HUD's level. It caps at 10, where the
// spawn interval hits its floor: a level that changes nothing must not keep
// announcing itself (the rule SPEC 09 wrote).
export const TIER = {
    hitsPer: 20,
    max: 10,
    speedBase: 170, // px/s at tier 1
    speedPerTier: 1.12, // ×1.12 a tier → 471 px/s at tier 10
    spawnBase: 1.2, // seconds between spawns at tier 1
    spawnPerTier: 0.09,
    spawnFloor: 0.35, // ≈2.9 ducks/s, which no keyboard scope can service
} as const;

export const SCORE = { perDuck: 100 } as const; // × the streak multiplier

// Mirror of the :root tokens of app/globals.css. The engine does not read CSS.
export const PALETTE = {
    skyTop: "#2a1400", // dusk, the same gradient the cover art uses
    skyBottom: "#0a0a0f", // --bg
    grass: "#00291b",
    grassLine: "rgba(0, 255, 136, 0.35)", // --green, the horizon glow
    duckBody: "#0f0f18", // --bg-2: a silhouette, not an illustration
    duckEdge: "#00f5ff", // --cyan
    duckBeak: "#f5ff00", // --yellow
    hitFlash: "#ff006e", // --magenta
    // The five multiplier colours, ×1 to ×5. This is how the streak is
    // reported: rule 2 forbids text inside the canvas.
    streak: ["#8a8fb5", "#00f5ff", "#00ff88", "#f5ff00", "#ff006e"],
} as const;
```

### 3.3 — `app/lib/engines/ducks/entities.ts`

Two classes and one loose function, all with `draw(ctx)` taking the context as a parameter, as
the contract requires.

- **`type DuckState = "cruising" | "hit"`**. Only a `cruising` duck can be shot; a `hit` one
  falls to the grass and is cosmetic, because the score, the streak and the clock resolved the
  instant the state changed. There is no fleeing state: escaping is leaving the far edge.
- **`class Duck`.** Holds `x`, `y`, `laneY`, `dir` (`1` or `-1`), `state`, `t` and `speed`, which
  the engine hands it from the tier.
    - `update(dt)` moves `x` by `speed * dir * dt` and sets
      `y = laneY + bobAmplitude * sin(bobOmega * t)` while `cruising`; a `hit` duck falls at
      `fallSpeed` and stops mattering.
    - `escaped` is `state === "cruising"` and `x` past the far edge by `spawnMargin`. The engine
      turns that into a clock penalty and a broken streak.
    - `gone` is `escaped` or `state === "hit" && y > FIELD.grassY`. The engine drops the duck
      from the list.
    - `contains(px, py)` is the whole of the collision: the padded box `w + 2 * hitPad` ×
      `h + 2 * hitPad` centred on the duck. No circle, no polygon, no sweep.
    - `draw(ctx, tint)` paints the silhouette: a body ellipse, a head circle, a triangular beak
      in `duckBeak`, and one of two wing shapes chosen by `floor(t / flapPeriod) % 2`. `dir`
      mirrors it with a `scale(-1, 1)` around its own centre, and `tint` is the current
      multiplier colour, used for the outline so the streak is visible on the birds too. A duck
      in the first 0.12 s after being hit gets a `hitFlash` halo.
- **`class Scope`.** Holds its position, the seconds left on its cooldown and the current
  multiplier index.
    - `update(dt, input)` moves it by `SCOPE.speed * dt`, normalising a diagonal so two keys are
      never faster than one, clamps `x` to `[0, WORLD.w]` and `y` to `[yMin, yMax]`, and counts
      the cooldown down.
    - `canFire` is `cooldown <= 0`.
    - `draw(ctx)` paints four ticks around a gap plus a thin ring, in
      `PALETTE.streak[multiplierIndex]`, and grows to 1.4× for 0.08 s after a shot. The ring's
      colour is the multiplier — the only place it is reported.
- **`drawField(ctx, low)`** paints the sky gradient, the grass band and the horizon line, plus a
  magenta vignette that pulses when `low` is true, which is the clock's last-ten-seconds
  warning. It draws **no text**: rule 2 of the contract forbids any HUD inside the canvas, and
  the seconds themselves travel in `snapshot.timeLeft` for `PlayerShell` to print.

### 3.4 — `app/lib/engines/ducks/engine.ts` — the boundary

`createDucksEngine(canvas, on): EngineHandle`, with the same types as
`app/lib/engines/asteroides/engine.ts`:

```ts
export type GameStatus = "ready" | "playing" | "paused" | "over";

export type GameSnapshot = {
    score: number;
    lives: number; // always 0: there are no lives, the shell paints «—»
    level: number; // the tier, 1..10
    timeLeft: number; // seconds, rounded to one decimal before emitting
};
```

What lives inside:

- **The state machine** `ready → playing ⇄ paused → over`. `start()` needs no asset gate: this
  cartridge loads nothing.
- **The loop.** `requestAnimationFrame` with `dt` capped to `MAX_DT`, stopped in `"paused"` and
  in `"over"`, and resetting its timestamp on resume so the first `dt` after a pause is 0. The
  clock only advances inside `"playing"`, so a pause is never a penalty.
- **The stream.** A spawn timer of
  `max(TIER.spawnFloor, TIER.spawnBase - TIER.spawnPerTier * (tier - 1))` seconds releases one
  duck, from a random side, at a random `laneY` in `[laneMin, laneMax]`, at
  `TIER.speedBase * TIER.speedPerTier ** (tier - 1)` px/s. A spawn that would exceed
  `DUCK.maxAlive` is skipped without penalty.
- **The tier.** `tier = min(TIER.max, floor(hits / TIER.hitsPer) + 1)`. It is the HUD's level and
  it drives both the spawn interval and the speed.
- **The shot.** On `Space` with `scope.canFire` and `status === "playing"`: the topmost
  `cruising` duck whose `contains(scope.x, scope.y)` is true takes the hit — **one duck per
  shot**, never two. A hit adds `SCORE.perDuck * multiplier`, bumps the streak, adds
  `CLOCK.perHit` to the clock and sets the duck to `hit`. A miss adds `CLOCK.perWastedShot` and
  resets the streak to zero. Either way the cooldown restarts.
- **The escape.** A duck that leaves the far edge adds `CLOCK.perEscape` and resets the streak.
- **The clock.** `time = min(CLOCK.cap, time + delta)` on every change, `time -= dt` every frame
  while playing, and `"over"` the moment it crosses zero. The cap is what keeps a good stretch of
  play from banking an unlosable run.
- **The multiplier.** `min(STREAK.maxMultiplier, floor(streak / STREAK.step) + 1)`, so ×1 for
  the first five hits and ×5 from the twentieth. It is reported inside the canvas as the scope's
  ring colour and the ducks' outline, never as text and never in the snapshot.
- **The keys.** `keydown` and `keyup` on `window` feed a held-keys set: arrows and WASD move,
  `Space` fires, `P` and `Esc` pause, and `Space` or any direction starts from `"ready"` — the
  press that starts the run does not fire, because the fire path waits for that key's `keyup`.
  `preventDefault()` **only while `status === "playing"`**, and only on those keys: with the end
  modal open the status is `"over"`, so the initials input types normally, spaces included.
- **Automatic pause** on `visibilitychange` when the tab is hidden, which also **clears the
  held-keys set**: a key held when the tab hides never sends its `keyup`, and the scope would
  slide forever on resume. The clock does not tick while paused.
- **No canvas listener at all.** This take uses no mouse, so — unlike BLOQUE BUSTER — nothing is
  bound to the canvas and no `getBoundingClientRect()` conversion exists. The engine is as
  keyboard-only as SNAKE.
- **The scaling.** `canvas.width = WORLD.w * dpr` with `dpr` capped at 2, then
  `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`, so the game always reasons in world coordinates and
  the vector ducks stay sharp.
- **A static frame in `"ready"` and in `"over"`** — field, scope centred, no ducks — so the
  overlay never sits on a black rectangle.
- **`snapshot` only when a value changes**, and `timeLeft` **rounded to one decimal first**. That
  is the clause of rule 3 no cartridge had used yet: without the rounding the clock would emit
  sixty snapshots a second, and with it the worst case is ten. `score`, `lives` and `level`
  change far less often and ride along.
- **`destroy()`** cancels the `requestAnimationFrame` and removes the three window listeners.
  Without it StrictMode's double mount leaves two loops running, and both the ducks and the clock
  move at double speed.

The engine imports no React — `grep -rn 'from "react"' app/lib/engines` must stay empty — draws
no text, and knows no DOM beyond its own canvas and the `window` it listens to.

`app/globals.css` is touched **only** for `.cover-ducks`. The world is 800×600, the exact 4:3 of
`.crt-screen`, so `.game-canvas` from SPEC 05 already covers it and no letterbox rule is needed.

### 3.5 — The registry

One import and one entry in `app/components/game-registry.ts`, like the four before it:

```ts
const DucksGame = dynamic(() => import("@/app/components/ducks-game"), {
    ssr: false,
});

export const GAME_ENGINES: Partial<
    Record<string, ComponentType<GameComponentProps>>
> = {
    asteroides: AsteroidesGame,
    caida: CaidaGame,
    "bloque-buster": BloqueBusterGame,
    snake: SnakeGame,
    ducks: DucksGame,
};
```

`game-player.tsx`, `player-shell.tsx` and the two page routes are not touched. The four
cartridges without an engine keep falling back to `fake-game-player.tsx`.

### 3.6 — What reaches `PlayerShell`

`app/components/ducks-game.tsx` translates the callbacks into state and fills the props that
already exist. None is added:

| prop            | value                                                      |
| --------------- | ---------------------------------------------------------- |
| `game`          | the `ducks` row handed down by the route                   |
| `score`         | `snapshot.score`                                           |
| `lives`         | `0` — the shell paints `—`, the case CAÍDA opened          |
| `level`         | `snapshot.level`, the tier from 1 to 10                    |
| `extraStat`     | `{ label: "TIME", value: "32.4" }` — one decimal, always   |
| `paused`        | `status === "paused"`                                      |
| `over`          | `status === "over"`                                        |
| `onTogglePause` | `pause()` / `resume()`                                     |
| `onEnd`         | `end()`                                                    |
| `onRestart`     | `restart()`                                                |
| `children`      | `<canvas className="game-canvas">` and the `ready` overlay |

The value of `extraStat` is formatted with `toFixed(1)` in the component, so `32` reads `32.0`
and the slot never changes width. The component follows `snake-game.tsx` to the letter, because
that is the other keyboard-only cartridge: the engine lives in a `useRef` and never in state, a
`useEffect` with `[]` dependencies creates it and calls `destroy()` in the cleanup, and
`matchMedia("(pointer: coarse)")` is read with `useSyncExternalStore` and never with a
`setState` inside an effect, or hydration breaks. With a coarse pointer it renders
`KEYBOARD REQUIRED` and the control list instead of the start overlay, and does not create the
engine.

---

## 4 — Implementation plan

Each step leaves the app building and the seven routes navigable.

1. **`app/lib/engines/ducks/constants.ts`.** The values of section 3.2, each block carrying the
   reason for its number, because there is no original to cite.
   Verify: `npx tsc --noEmit` clean, `170 * 1.12 ** 9` evaluates to ≈ 471 px/s and
   `1.2 - 0.09 * 9` to `0.39`, so the spawn floor of 0.35 s is reached one tier past the cap —
   the numbers the ceiling of section 6 is built on.

2. **`app/lib/engines/ducks/entities.ts`.** `Duck`, `Scope` and `drawField` from section 3.3,
   with `draw(ctx)` taking the context, the diagonal normalisation in the scope and `contains()`
   as the only collision code.
   Verify: `npx tsc --noEmit` and `npm run lint` with no warnings.

3. **`app/lib/engines/ducks/engine.ts`.** `createDucksEngine` with everything in section 3.4:
   the state machine, the capped loop, the spawn timer and the tier, the shot and its
   single-duck hit test, the clock economy and its cap, the streak and its colours, the keys with
   their held-set and their conditional `preventDefault()`, the `visibilitychange` pause that
   clears the set, the `dpr` scaling, the one-decimal rounding of `timeLeft` and `destroy()`.
   Verify: `npx tsc --noEmit` clean and `grep -rn 'from "react"' app/lib/engines` empty.

4. **`app/globals.css`.** The `.cover-ducks` block of section 3.1, appended inside the
   `NOT PART OF THE PORT` banner under a `SPEC 10` label. Nothing else in the file is edited, and
   no letterbox rule is added: the world is 4:3.
   Verify: `npm run format:check` passes and the eight existing cover generators are untouched in
   the diff.

5. **`app/components/ducks-game.tsx`.** A `"use client"` component modelled on
   `snake-game.tsx`:
    - creates the engine in a `useEffect` with `[]` and calls `destroy()` in the cleanup;
    - keeps `snapshot` and `status` in state and passes them to `<PlayerShell>` as in section
      3.6, formatting `timeLeft` with `toFixed(1)`;
    - renders `<canvas className="game-canvas">` inside `.crt-screen` and, on top, the `"ready"`
      overlay: the title, the controls (`← ↑ → ↓` / `WASD` aim · `SPACE` fire · `P` pause) and
      `▸ PRESS SPACE_`. The pause overlay and the end modal belong to the shell;
    - with a coarse pointer, shows `KEYBOARD REQUIRED` with the control list and does not start
      the engine;
    - wires `FIN` to `end()`, `PAUSA` to `pause()`/`resume()` and `JUGAR DE NUEVO` to
      `restart()`.

    Verify: `/games/ducks/play` opens stopped, the space bar starts the run without firing, and
    downing a duck moves the score and `TIME` in the HUD.

6. **`app/components/game-registry.ts`.** The `dynamic()` and the `ducks` entry of section 3.5.
   Verify: `/games/ducks/play` mounts the real game; the other four engineless cartridges still
   land on `fake-game-player.tsx`, and their route bundles pull no engine.

7. **The database step.** Write `supabase/migrations/<timestamp>_add_ducks_cartridge.sql` with
   the `alter table` and the `insert` of section 3.1 — confirming the constraint name with the
   `pg_constraint` query first — apply it with `apply_migration` under the description
   `add_ducks_cartridge`, rename the local file to the timestamp `list_migrations` reports so the
   repository and the remote registry tell the same story, and regenerate
   `app/lib/supabase/types.ts` with `generate_typescript_types`.
   In the same step, add `| "cover-ducks"` to the `CoverArt` union in `app/lib/games.ts`: the
   three coordinated changes of the ninth cover art land together with step 4.
   Verify: `select id, cat, cover, sort_order, max_score from public.games order by sort_order`
   returns nine rows with `ducks` last, `insert … values ('x', …, 'cover-nope', …)` is rejected by
   the constraint, and the regenerated `types.ts` shows **no** diff.

8. **The documentation.** `CLAUDE.md`: the cartridges that really play go from four to **five** —
   ASTEROIDES, CAÍDA, BLOQUE BUSTER, SNAKE and DUCKS — the catalogue holds nine rows, four of
   which still show the mock of SPEC 01, `app/lib/engines/ducks/` joins the engine convention as
   the first cartridge whose HUD carries a continuously changing value, and the naming convention
   is recorded: new cartridges are named, labelled and documented in English, while the four
   shipped ones keep their Spanish ids. `references/implemented-games.md`: a fifth per-cartridge
   section, the two summary tables, the `Not implemented yet` list down to three rows, and a new
   `Last checked` date.
   Verify: neither file still claims that four cartridges play or that the catalogue has eight
   rows.

9. **Final verification.** `npm run build`, `npm run lint` and `npx tsc --noEmit`. Walk the seven
   routes (`/`, `/games`, `/games/[id]`, `/games/[id]/play`, `/login`, `/hall-of-fame`, `/about`)
   checking that the only change is a ninth card at the end of the library, and play a full run
   through to saving the mark.

---

## 5 — Acceptance criteria

The fixed block every cartridge inherits, translated into English with its checks unchanged. The
strings in quotes are the shell's own UI and stay in Spanish, because `PlayerShell` is not this
spec's to translate:

- [ ] `npm run build`, `npm run lint` and `npx tsc --noEmit` finish with no errors.
- [ ] `grep -rn 'from "react"' app/lib/engines` returns nothing.
- [ ] There is not one piece of text drawn inside the canvas: the HUD is painted by
      `PlayerShell`.
- [ ] With StrictMode mounting twice, the run does not play at double speed.
- [ ] Leaving the route stops consuming CPU: no `requestAnimationFrame` is left alive.
- [ ] During a run the game's keys do not scroll the page; with the modal open, the initials
      input types normally, spaces included.
- [ ] Switching tabs pauses the run on its own, and on resume no duck teleports.
- [ ] Finishing a run, typing a name and pressing `GUARDAR PUNTUACIÓN` inserts a row in
      `public.scores` and shows `▸ PUNTUACIÓN GUARDADA_`.
- [ ] That mark shows up in `/hall-of-fame` and in the side panel of `/games/ducks` without
      waiting for any interval, and the card's record updates after the `games` tag is
      revalidated.
- [ ] The other cartridges still fall back to `fake-game-player.tsx`, unchanged.
- [ ] The browser console logs no errors and no hydration warnings.

And the ones specific to this game:

- [ ] `/games` shows **nine** cards and the last one reads `DUCKS`, with the magenta `JUGAR`
      button and the new cover art. The home rail still shows the first six games and the counter
      reads `9+`.
- [ ] `/games/ducks` and `/games/ducks/play` load, and the detail page shows `SHOOTER`.
- [ ] A run opens with the HUD at score 0, lives `—`, level `01` and `TIME 45.0`.
- [ ] The space bar that starts the run does not fire a shot.
- [ ] `TIME` counts down while playing, is frozen while paused and while the modal is open, and
      always shows exactly one decimal.
- [ ] Downing a duck adds 0.8 s to the clock; a shot at nothing subtracts 0.4 s; a duck reaching
      the far edge subtracts 2.5 s.
- [ ] Five consecutive hits raise the multiplier: the sixth duck is worth 200 and the scope's
      ring changes colour. Twenty consecutive hits reach ×5 and 500 a duck, and it goes no
      higher.
- [ ] A wasted shot or an escaped duck drops the multiplier back to ×1, and the ring's colour
      goes with it.
- [ ] The clock never rises above 60.0 however many ducks are downed in a row.
- [ ] The clock reaching zero ends the run and opens the modal, and no shot fired after that
      counts.
- [ ] The level reads `02` after twenty ducks are downed and `10` after a hundred and eighty; the
      spawn rate and the flight speed stop changing from there.
- [ ] Holding two direction keys moves the scope diagonally at the same 520 px/s as one key
      alone.
- [ ] The scope cannot leave the canvas, and it never rises above `y = 60` nor sinks past
      `y = 520`.
- [ ] Two shots inside 0.22 s fire once: the cooldown holds, and the second press costs nothing.
- [ ] One shot downs at most one duck: firing at two overlapping ducks resolves the topmost one
      only.
- [ ] Holding a direction key, switching tabs and coming back leaves the scope still.
- [ ] Under ten seconds the vignette pulses, and no number is drawn inside the canvas at any
      point.
- [ ] On a coarse-pointer device the cartridge shows `KEYBOARD REQUIRED` and does not start the
      engine.
- [ ] `select count(*) from public.games` returns 9, and inserting a row with an unknown `cover`
      is still rejected by `games_cover_check`.
- [ ] `app/lib/supabase/types.ts` does not change after regenerating it.

---

## 6 — Decisions taken and discarded

This spec was written without a question round, so every decision `/add-game` would have asked
about is taken here with its reason, discarded options included.

**On the game the theme became**

- **Yes:** a duck shooting gallery. It is the classic a player recognises behind «ducks», it is
  the cheapest engine in the SHOOTER bucket — sinusoidal paths, no entity-to-entity collision,
  one point-in-rect per shot — and it fits the SPEC 05 contract with no asset, no network and no
  physics library.
- **No:** ducks flying in rows over a cannon. That is Space Invaders with a duck skin, and
  `references/game-suggestions-todo.md` already recommends `invasores` as the fifth cartridge. A
  repaint of a queued game is not a new game.
- **No:** a duck crossing a road or a river. That is Frogger, which is what the `ranaria` row
  promises.
- **No:** anything 3D, online or asset-heavy. The contract is a fixed 800×600 world, keyboard and
  mouse, and few or no binary assets.

**On the language of the cartridge**

- **Yes:** the id is `ducks`, the title is `DUCKS`, the engine folder is
  `app/lib/engines/ducks/` and the HUD label is `TIME`. All the copy this spec introduces — card
  text, overlays, control labels — is English. It is the repository's new convention: code,
  comments and documentation are written in English from here on, and a cartridge is code.
- **Yes:** id, title, URL slug and engine folder all say the same word, which is the rule SPEC 09
  argued for when it refused to keep `serpentina` under the title `SNAKE`.
- **No:** `patos`, and no Spanish HUD labels. The four shipped cartridges — `asteroides`,
  `caida`, `bloque-buster`, `snake` — keep their Spanish ids, titles and labels, and **renaming
  them is out of scope**: it is a catalogue-wide migration plus four engine folders plus every
  spec that names them, and it buys nothing this cartridge needs.
- **No:** translating `PlayerShell`. Its labels (`Jugador`, `Puntuación`, `Vidas`, `Nivel`,
  `PAUSA`, `FIN`, `GUARDAR PUNTUACIÓN`) belong to the screen, which is on the never-touch list.
  The mix is deliberate and visible, and unifying it is a platform spec.

**On the catalogue row**

- **Yes:** a new row with the id `ducks` at `sort_order 8`, which takes the catalogue from eight
  rows to nine. This is the first spec to grow it; SPEC 09 replaced a row and SPEC 07 and SPEC 08
  inherited one.
- **No:** take over `invasores`. Its `cat` and `cover` would have fit and the migration would
  have shrunk to a `max_score` update, but that row is the one the planner's To-Do recommends as
  the fifth cartridge, dated 2026-09-09, and its cover art — rows of dots over a cannon —
  promises Space Invaders to anyone reading the card.
- **No:** take over `gloton`, `ranaria` or `duelo-pixel`. Each promises a different classic that
  is still queued, and none of their three cover generators reads as a bird in a sky: a yellow
  pac shape with dots, cyan traffic lanes, and two paddles with a ball.
- **Yes:** a ninth cover art, `cover-ducks`, with its three coordinated changes planned in
  section 3.1 — the `CHECK`, the CSS rule and the union member. It is the expensive branch and it
  is taken with open eyes, because the alternative is a card that lies about the game.
- **Yes:** the `app/lib/games.ts` edit, and **only** that one line. It is the single exception
  the `/add-game` contract grants to the never-touch list, it adds a string to a union, and no
  other file on that list is opened.
- **Yes:** `.cover-ducks` under the `NOT PART OF THE PORT` banner and not beside the other eight
  generators. `app/globals.css` is a verbatim port of the reference template, and anything added
  outside it belongs in that banner in a labelled block.
- **Yes:** `cat = SHOOTER`. A gallery is a shooter, and it takes the category from two rows to
  three of nine.
- **Yes:** `color = magenta`. This take is a dusk game whose clock warning, hit flash and top
  multiplier are all magenta, and the `JUGAR` button should match the game behind the card. It
  also keeps `magenta` from being CAÍDA's alone.
- **Yes:** `plays = '0'`. The column is a display string, not a counter, and a brand-new
  cartridge has been played zero times. Inventing a `14.2K` for a game nobody has opened is the
  one lie the seeded rows can afford and a new row cannot.
- **No:** seeding scores for `ducks`. SPEC 06 seeded only ASTEROIDES because it was the only game
  that really played; an empty board is the truth here too.

**On the clock, which is this take's whole design**

- **Yes:** a countdown clock as the only life. A gallery has no natural death, and of the endings
  available — a timer, a miss limit, an escape limit — the clock is the one that keeps the player
  shooting instead of hiding: every duck is both points and seconds.
- **Yes:** 45 seconds to start. Long enough to reach the ×5 multiplier on a good opening, short
  enough that a bad one is over inside a minute.
- **Yes:** +0.8 s a hit and −2.5 s an escape. An escape costs a little over three hits to undo,
  so letting one through is a real setback and not a rounding error.
- **Yes:** −0.4 s a wasted shot. Unlimited ammunition needs a price or the correct strategy is to
  hold the space bar down; half the value of a hit is enough to make spraying lose.
- **Yes:** the clock capped at 60 s. Without a cap a strong player banks minutes in the early
  tiers and the run stops being able to end, which would take the score ceiling with it.
- **Yes:** the clock stops while paused and while the end modal is open. A pause is a platform
  affordance, not a penalty.
- **No:** a fixed-length round of 60 s with no way to extend it. It is simpler, but it makes the
  score a pure rate and removes the only interesting decision — whether to take a hard shot or
  wait for an easy one.
- **No:** a miss limit («three wasted shells and out»). It is an ending that punishes attempting
  the hard shot, which is the opposite of what this take wants.
- **No:** three lives lost to escaping ducks. That is the other variant's ending, and having both
  would make the two specs the same game with different palettes.

**On the scoring and the ceiling**

- **Yes:** 100 points a duck times a streak multiplier of ×1 to ×5, one step every five
  consecutive hits. The streak is what makes a wasted shot hurt twice — clock and multiplier —
  and it rewards the clean patch of play rather than mere survival.
- **No:** a flat price a duck. It is easier to reason about and it is what the other variant
  does; here it would leave the wasted shot with only a clock cost.
- **No:** `perDuck × tier`. The tier already raises the score indirectly by delivering more ducks,
  and multiplying twice makes the ceiling unpredictable.
- **Yes:** the multiplier resets on a wasted shot **and** on an escaped duck. Both are the same
  failure — a duck that got away — and forgiving one of them would make ignoring the far side of
  the sky the optimal play.
- **Yes:** `max_score = 200000`, from this arithmetic:
    - Tiers 1 to 9 are 180 ducks, and a top player is close to perfect there because the sky is
      slower than the scope: tier 9 flies at `170 × 1.12⁸ ≈ 421 px/s` against 520 px/s of scope.
    - The multiplier ramp costs the first twenty ducks: `100 × (5×1 + 5×2 + 5×3 + 5×4) = 5 000`
      instead of 10 000. Ducks 21 to 180 pay `160 × 500 = 80 000`. Through tier 9 that is
      **85 000**.
    - From tier 10 the spawn interval sits at its 0.35 s floor, so 2.9 ducks arrive a second while
      a scope that needs half a second of travel plus 0.22 s of cooldown services at best ~1.4 a
      second. The clock then moves `+0.8 × 1.4 − 2.5 × 1.5 ≈ −2.6` s per second, so a full 60 s
      bank buys about 23 seconds and some 32 more hits: **≈ 16 000** more points.
    - A best plausible run is therefore around **101 000**, and 200 000 is roughly twice that. The
      margin is wider than SNAKE's 1.8× on purpose: the endgame estimate rests on a human hit
      rate, not on a finite board.
- **No:** the seeded default of 10 000 000. `max_score` is the only real guard on the table — RLS
  lets anyone insert and there is no identity until the auth spec — and the default lets through
  anything.
- **No:** `100000`. A very good run lands right on it, and a ceiling a legitimate mark bounces
  off is a bug.
- **No:** `1000000`. It accepts marks the game cannot produce.

**On the tiers, and on why the run always ends**

- **Yes:** a tier every twenty ducks downed, raising the speed by ×1.12 and shortening the spawn
  interval by 0.09 s. Progress is earned by hitting, not by surviving, so a passive player never
  sees tier 3.
- **Yes:** the tier **caps at 10**, the same rule SNAKE wrote: past that the spawn interval is at
  its floor and a level that changes nothing must not keep announcing itself.
- **Yes:** and the flat endgame is still a losing race, which is the load-bearing claim of this
  design: 2.9 ducks a second arrive and at most ~1.4 can be serviced, so the clock drains about
  2.6 s per second and no run survives its own bank. That is what makes the ceiling above an
  arithmetic instead of a hope.
- **No:** an uncapped tier. Speed alone would eventually beat the display's refresh rate, and the
  HUD would announce a level that no longer means anything.
- **Yes:** `DUCK.maxAlive = 9`, with the exceeding spawn skipped silently. At the top tier five to
  six ducks share the sky; nine is headroom, and skipping a spawn costs the player nothing.

**On the HUD**

- **Yes:** `lives = 0`, which the shell paints as `—`. There are no lives in this take, and the
  contract has covered the case since CAÍDA.
- **Yes:** `level` carries the tier. The tier **is** the difficulty — speed and spawn rate — so
  the number and the feeling move together.
- **Yes:** `extraStat = { label: "TIME", value: "32.4" }`. There is exactly one extra slot and
  the clock is the run itself; nothing else deserves it.
- **Yes:** `timeLeft` rounded to one decimal before being emitted. It is the first cartridge to
  use that clause of rule 3, and it turns sixty snapshots a second into at most ten.
- **Yes:** one decimal always, `toFixed(1)` in the component, so the slot never changes width and
  the number never jitters the HUD bar.
- **No:** the multiplier in the extra slot. There is one slot and the clock has it; a run with no
  visible clock is unplayable, a run with no visible multiplier is merely less informative.
- **Yes:** the multiplier reported inside the canvas as the scope's ring colour and the ducks'
  outline. It is a colour, not text, so rule 2 holds, and it sits exactly where the player is
  already looking.
- **No:** drawing the seconds inside the canvas next to the scope. That is a HUD in the canvas,
  which rule 2 forbids, and it duplicates what the shell already prints.

**On the controls**

- **Yes:** keyboard only — arrows or WASD to move the scope, space bar to fire. The scope's travel
  time is this take's difficulty knob: a duck across the sky is 1.54 s away, and that is what
  makes the far side of the sky a real decision.
- **Yes:** a 520 px/s scope with diagonals normalised, so two keys are never faster than one.
- **Yes:** a 0.22 s cooldown with unlimited ammunition. It is what keeps the space bar from being
  a machine gun without introducing a second resource to watch.
- **Yes:** the press that starts the run does not fire, and the fire path waits for that key's
  `keyup`. Otherwise starting the game always costs 0.4 s of clock.
- **Yes:** `P` and `Esc` pause, and `Space` or any direction starts from `"ready"`. It matches the
  four cartridges already shipped.
- **Yes:** `preventDefault()` on the game's keys **only while `status === "playing"`**. With the
  end modal open the status is `"over"`, so the initials input types normally, spaces included.
- **Yes:** the held-keys set is cleared on pause and on `visibilitychange`. A key held when the
  tab hides never sends its `keyup`, and the scope would slide forever on resume — the same trap
  SPEC 05 documented for the ship's thruster.
- **No:** the mouse, in any form. It would delete the travel time the whole design rests on, and
  a pointer-aimed gallery is exactly what the other variant of this jam is. As a result this
  engine binds nothing to its canvas and needs no `getBoundingClientRect()` conversion.
- **No:** touch controls. With a coarse pointer the cartridge shows `KEYBOARD REQUIRED` and does
  not start the engine, the same shape ASTEROIDES uses.

**On the rules and the run**

- **Yes:** ducks cross the whole sky and escape through the far edge. It gives every duck a
  deterministic window — 5.2 s at tier 1, 1.9 s at tier 10 — which is what lets the clock
  economy be reasoned about at all.
- **No:** ducks that turn at the walls and fly away on a timer. It is the cabinet's behaviour and
  it is the other variant's; here it would blur the one thing the clock measures.
- **Yes:** one duck per shot. The hit test resolves the topmost duck only; a spread that could
  take two would make the cooldown and the streak meaningless.
- **Yes:** the fall of a downed duck is cosmetic. Score, streak and clock resolve on the hit, so
  the snapshot never waits for an animation.
- **Yes:** `MAX_DT = 0.05`, not BLOQUE BUSTER's 0.02. Nothing here sweeps against anything: the
  only test is point-in-rect at the instant of a shot, against a position already on screen.
- **Yes:** `restart()` resets the clock to 45, the score, the streak, the tier and the spawn
  timer, empties the sky, recentres the scope, drops back to `"ready"` and redraws the static
  frame. It is the same reset `start()` starts from, so there is one code path and not two.
- **Yes:** the run ends with `"over"` and nothing else. `PlayerShell` knows `over` and has no idea
  of a victory screen — the same decision SPEC 08 and SPEC 09 took.

**On the assets**

- **Yes:** vector ducks drawn with canvas primitives. It is the same call SPEC 07 and SPEC 08
  made when they dropped their originals' spritesheets, and a silhouette with a flapping wing
  reads better in the CRT frame than a 32 px sprite would.
- **No:** a sprite sheet. It would bring back the loading gate SPEC 09 built, and here the asset
  would be decoration, not the game — which is exactly the line SPEC 09 drew.
- **No:** audio. A shot and a quack are tempting and they are the start of platform audio: a
  remembered mute and a control in `PlayerShell`. BLOQUE BUSTER stays the only cartridge that
  makes a sound.
- **No:** the dog. The laugh is the most memorable thing about the original and it is a sprite, a
  cutscene and an animation budget that buys nothing in the score loop.

---

## 7 — Identified risks

| Risk                                                                                        | Mitigation                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| StrictMode mounts twice and leaves two loops running, so the ducks and the clock double     | `destroy()` is part of the contract and the mounting `useEffect` calls it in its cleanup. There is an acceptance criterion for it.                                                             |
| `preventDefault()` swallows the initials input in the end modal                             | It is called only while `status === "playing"`; with the modal open the status is `"over"`. The criterion types a name with a space in it.                                                     |
| Coming back from another tab drains the clock or jumps the ducks                            | `dt` is capped at `MAX_DT`, `visibilitychange` pauses the run and the clock does not tick while paused; the loop resets its timestamp on resume, so the first `dt` is 0.                       |
| A key held when the tab hides never sends its `keyup` and the scope slides forever          | The held-keys set is cleared on pause and on `visibilitychange`, and a criterion checks it.                                                                                                    |
| The clock emits a snapshot on every frame and the HUD re-renders sixty times a second       | `timeLeft` is rounded to one decimal before being emitted, so the worst case is ten emissions a second. It is rule 3 of the contract applied literally.                                        |
| The clock's economy is wrong and runs are either endless or over in ten seconds             | The four numbers live in `CLOCK` in `constants.ts` and the arithmetic behind them is written in section 6, so tuning is a one-file change with a documented starting point.                    |
| The three coordinated changes of the ninth cover art drift apart                            | Steps 4 and 7 land together and the verification of step 7 rejects an unknown `cover` and diffs the regenerated types. A missing CSS rule shows as a blank card on `/games` in the final walk. |
| The `games` tag caches the catalogue, so the ninth card does not appear after the migration | `getGames` is cached under the `games` tag; a saved score revalidates it, and a dev-server restart does too. Step 7 verifies against the database with `select`, not against the page.         |
| Nine cards break the library grid                                                           | `.games-grid` is `repeat(auto-fill, minmax(280px, 1fr))`, so the ninth card wraps. The home rail slices to `PREVIEW_COUNT = 6` and `ducks` sorts last, so the rail does not change.            |
| The multiplier is invisible to a colour-blind player, being reported only as a colour       | The five colours also step in ring thickness, and the score jump from 100 to 500 a duck is readable in the HUD. A textual multiplier would need a second extra slot, which the shell lacks.    |

---

## 8 — What is **not** in this spec

- **Sound.** DUCKS is silent. BLOQUE BUSTER stays the only cartridge that makes a noise, and
  platform audio — a remembered mute, a control in `PlayerShell`, silencing the other engines —
  is its own spec.
- **The dog**, its laugh and any cutscene.
- **The mouse**, in any form: no aiming with the pointer and no listener on the canvas.
- **Touch controls.** With a coarse pointer the cartridge shows `KEYBOARD REQUIRED`.
- **Ammunition, reloading, bonus rounds, clay pigeons and duck species with different prices.**
- **Renaming the four shipped cartridges** to English ids or labels, and translating
  `PlayerShell`.
- **A local record or a board inside the cartridge.** No `localStorage`: the mark is saved through
  `PlayerShell` and the ranking is the one from SPEC 06.
- **The four cartridges that still have no engine** — `gloton`, `invasores`, `ranaria`,
  `duelo-pixel` — which keep `fake-game-player.tsx`.

Each of those, if it lands, goes in its own spec.
