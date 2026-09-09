# SPEC 10 — DUCKS, the arcade take

> **State:** Draft
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-09-09
> **Game jam:** theme «ducks» — variant 1 of 2
> **Goal:** Write from scratch a mouse-fired duck shooting gallery as the new cartridge `ducks`, where every flush gives three shells and the third duck that flies away ends the run.

---

## 1 — Why this spec exists

The theme of this jam is **ducks**, and the classic a player recognises behind it is the
light-gun shooting gallery: two ducks break out of the grass, weave across the sky, and you
have a handful of shells to bring them down before they climb away. It is the cheapest
engine of the SHOOTER bucket — sinusoidal flight paths, no entity-to-entity collision, and a
single point-in-rect test at the instant of a click — and it is the first cartridge where the
**mouse fires** instead of moving something: BLOQUE BUSTER (SPEC 08) listens to its canvas to
slide a paddle, and that is as far as the pointer has ever gone.

A gallery also has no natural death. Snake bites itself, Tetris tops out, a ship runs out of
lives; ducks just keep coming. **The end of a run is therefore invented here**, and that is
the decision that splits this spec from its sibling.

This is the **arcade take**, faithful to the cabinet. It diverges from
`10-game-ducks-survival.md` on four axes, and two of them are the load-bearing ones:

- **Run ending.** Here the run ends on the **third duck that flies away**: three lives, one
  spent per escape, and a flush where you burn your shells on air sends every duck left alive
  straight up. The sibling has no lives at all and runs against a countdown clock that each
  hit refills.
- **Controls.** Here the **pointer aims and the click fires**, mouse only, with no keyboard
  aiming at all. The sibling never touches the mouse: it drives a scope with the arrow keys
  and fires with the space bar.

The other two follow from those. **Scoring** is flat — 500 a duck plus a 1 000 bonus for a
clean flush — where the sibling multiplies a streak up to ×5. And the **HUD** shows three
hearts, the round number and `SHELLS`, where the sibling shows `—`, a speed tier and `TIME`.

Only one of the two variants is ever promoted, so from here on this document stands alone and
does not mention the sibling again.

What this spec does **not** have to decide is anything about scores or about the player
screen: `PlayerShell`, the saving flow and the leaderboard of SPEC 06 work by themselves the
moment the id exists in `public.games`.

---

## 2 — Scope

**In:**

- A new engine in `app/lib/engines/ducks/`, three files — `constants.ts`, `entities.ts`,
  `engine.ts` — with no React import and no binary asset.
- A fixed 800×600 world, the exact 4:3 of `.crt-screen`, split into a sky band and a grass
  band, drawn entirely with canvas primitives.
- Flushes of two ducks that climb out of the grass, cruise with a sinusoidal bob, bounce off
  the side walls and climb away when their flight time runs out.
- Three shells per flush, one spent per click, hit or miss; when the shells run out, every
  duck still cruising flies away immediately.
- Three lives, one spent per duck that flies away, and a run that ends on the third.
- Rounds of five flushes — ten ducks — with the flight speed multiplied by 1.10 on every
  round and no ceiling.
- Flat scoring: 500 points a duck, plus 1 000 for a flush where both ducks fall.
- Mouse control: the pointer is the crosshair, the left button fires, `P` and `Esc` pause.
- The cartridge `app/components/ducks-game.tsx` and its entry in
  `app/components/game-registry.ts`.
- A ninth cover art, `cover-ducks`, with its three coordinated changes: the `CHECK` on
  `public.games.cover`, the `.cover-ducks` rule in `app/globals.css` and the new member of the
  `CoverArt` union in `app/lib/games.ts`.
- A migration that inserts the `ducks` row at `sort_order 8` with `max_score = 150000`, taking
  the catalogue from eight rows to nine.
- The documentation fix: `CLAUDE.md` and `references/implemented-games.md` on how many
  cartridges really play, and on the English naming convention this cartridge starts.

**Out of scope (for future specs):**

- **Sound.** DUCKS is silent. BLOQUE BUSTER stays the only cartridge that makes a noise, and
  platform audio — a remembered mute, a control in `PlayerShell` — is still its own spec.
- **The dog.** No sprite, no cutscene, no laugh. It is the most memorable thing about the
  original and it is pure art budget: it adds nothing to the score loop and this cartridge
  ships no binary asset.
- **Touch controls.** With a coarse pointer the cartridge shows `MOUSE REQUIRED` and does not
  start the engine, the same shape ASTEROIDES uses for `SE REQUIERE TECLADO`.
- **A keyboard aiming fallback.** This take is mouse-only on purpose; a keyboard scope is a
  different game and it is what the other variant of this jam is.
- **A bonus round, duck species worth different points, and clay pigeons.** One duck, one
  price.
- **Renaming the four shipped cartridges.** `asteroides`, `caida`, `bloque-buster` and `snake`
  keep their Spanish ids, titles and HUD labels. The English convention starts here and does
  not walk backwards.
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
**three coordinated changes** that must land together or the app breaks in three different
ways.

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
    'Three shells a flush. Do not let them fly away.',
    'The grass shakes and two ducks break for the sky. You get three shells before the flush is over, so every shot fired at nothing is a duck you will not reach. Each duck that climbs away costs one of your three lives, and every round of five flushes the flock flies faster.',
    'SHOOTER', 'cover-ducks', 'yellow', '0', 8, 150000
)
on conflict (id) do nothing;
```

The constraint name is the one Postgres derived from the inline `check` of
`20260904185251_create_games_and_scores.sql`, so confirm it before writing the file:

```sql
select conname from pg_constraint where conrelid = 'public.games'::regclass;
```

The `insert` carries a literal id and `on conflict (id) do nothing`, which is what SPEC 06
requires of every seed: with a random primary key the conflict could never fire and
re-applying would duplicate. The `alter table` is idempotent by way of the
`drop constraint if exists`.

**Change 2 — `app/globals.css`.** The file is a verbatim port of
`references/templates/home-about/styles.css`, so the new rule does **not** go beside the other
eight cover generators. It goes at the end, inside the `NOT PART OF THE PORT` banner, in its
own block labelled `SPEC 10`:

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
the `/add-game` contract names explicitly as part of the ninth-cover cost. It adds a string to
a union and changes no behaviour. Nothing else on the list is opened:
`player-shell.tsx`, `game-player.tsx`, `catalogue.ts`, `scores.ts`, `leaderboard.ts`,
`app/actions/scores.ts`, `rate-limit.ts` and the two page routes stay exactly as they are.

`app/lib/supabase/types.ts` is regenerated after the migration and must come out **identical**:
`cover` is typed `string`, and a `CHECK` is not part of the generated types.

The catalogue after the migration:

| column       | value                                             |
| ------------ | ------------------------------------------------- |
| `id`         | `ducks` — matches `^[a-z0-9-]{2,40}$`            |
| `title`      | `DUCKS`                                           |
| `cat`        | `SHOOTER` — the third of the category, after two  |
| `cover`      | `cover-ducks`                                     |
| `color`      | `yellow` — the `JUGAR` button variant             |
| `plays`      | `0` — nobody has played it; the column is display |
| `sort_order` | `8` — last card in the library                    |
| `max_score`  | `150000` — the arithmetic is in section 6         |

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
// point-in-rect at the instant of a click, against the position already on
// screen. At the fastest speed this game can reach (round 15, 570 px/s) a
// capped frame moves a duck 28 px, half its width, so BLOQUE BUSTER's 0.02 is
// unnecessary here.
export const MAX_DT = 0.05;

// The sky is where ducks live; the grass is where they come from and where a
// downed duck lands. 470 leaves 130 px of grass, enough to read the silhouette.
export const FIELD = {
    grassY: 470,
    skyTop: 90,
    cruiseMin: 110,
    cruiseMax: 330,
} as const;

export const DUCK = {
    w: 56,
    h: 40,
    hitPad: 6, // the box is 68×52: a shell that grazes the wing counts
    riseSpeed: 520, // px/s while climbing out of the grass
    bobAmplitude: 34, // px above and below the cruise altitude
    bobOmega: 3.4, // rad/s → a 1.85 s weave, fast enough to need leading
    flightTime: 5.5, // seconds of cruise before the duck climbs away
    fleeSpeed: 420, // px/s straight up, cosmetic: the life is already gone
    fallSpeed: 420, // px/s down to the grass, also cosmetic
    flapPeriod: 0.18, // seconds per wing frame, 2 frames
    turnMargin: 60, // px from the side wall where the duck flips direction
} as const;

export const FLUSH = {
    ducks: 2, // two at a time, like the cabinet
    shells: 3, // and three shells for both of them
    spawnGap: 90, // minimum px between the two spawn columns
    gap: 0.9, // seconds between a resolved flush and the next
} as const;

export const ROUND = {
    flushes: 5, // 5 × 2 = 10 ducks a round
    speedBase: 150, // px/s of horizontal cruise on round 1
    speedPerRound: 1.1, // ×1.10 each round, with no ceiling: the game has to end
} as const;

export const SCORE = {
    perDuck: 500, // flat: this take does not multiply by the round
    perfectFlush: 1000, // both ducks down before the shells run out
} as const;

export const RUN = { lives: 3 } as const; // one per duck that flies away

export const CROSSHAIR = { radius: 14, gap: 5, thickness: 2 } as const;

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
    crosshair: "#ff006e", // --magenta
    shellSpent: "rgba(255, 255, 255, 0.06)", // --line-2
} as const;
```

### 3.3 — `app/lib/engines/ducks/entities.ts`

Two classes and one loose function, all with `draw(ctx)` taking the context as a parameter, as
the contract requires.

- **`type DuckState = "rising" | "cruising" | "hit" | "fleeing"`**. Only a `cruising` duck can
  be shot; `hit` falls to the grass and `fleeing` climbs off the top, and both are cosmetic —
  the score and the life were resolved the moment the state changed.
- **`class Duck`.** Holds `x`, `y`, `cruiseY`, `dir` (`1` or `-1`), `state`, `t` (seconds in the
  current state) and `speed`, which the engine hands it from the round.
    - `update(dt)` advances the state: `rising` climbs at `riseSpeed` until `y <= cruiseY`,
      `cruising` moves `speed * dir * dt` and sets
      `y = cruiseY + bobAmplitude * sin(bobOmega * t)`, flipping `dir` when `x` comes within
      `turnMargin` of either wall. It returns nothing; the engine reads `state` and `t`.
    - `expired` is `state === "cruising" && t >= DUCK.flightTime`. The engine turns that into an
      escape.
    - `gone` is `state === "fleeing" && y < -DUCK.h` or `state === "hit" && y > FIELD.grassY`.
      The engine drops the duck from the list.
    - `contains(px, py)` is the whole of the collision: the padded box
      `w + 2 * hitPad` × `h + 2 * hitPad` centred on the duck. There is no circle, no polygon
      and no sweep.
    - `draw(ctx)` paints the silhouette: a body ellipse, a head circle, a triangular beak in
      `duckBeak`, and one of two wing shapes chosen by `floor(t / flapPeriod) % 2`. `dir` mirrors
      it with a `scale(-1, 1)` around its own centre. A duck in `hit` is drawn upside down; a
      duck in the first 0.12 s after being hit also gets a `hitFlash` halo.
- **`class Crosshair`.** Holds the pointer position in world coordinates and whether the last
  shot was a hit.
    - `draw(ctx)` paints four ticks around a gap and a thin ring, in `crosshair`. It grows to
      1.4× for 0.08 s after a shot, which is the only recoil this game has.
- **`drawField(ctx)`** paints the sky gradient, the grass band and the horizon line. It draws
  **no text**: rule 2 of the contract forbids any HUD inside the canvas, and that includes the
  shells — those travel in `snapshot.shells` and `PlayerShell` prints them.

### 3.4 — `app/lib/engines/ducks/engine.ts` — the boundary

`createDucksEngine(canvas, on): EngineHandle`, with the same types as
`app/lib/engines/asteroides/engine.ts`:

```ts
export type GameStatus = "ready" | "playing" | "paused" | "over";

export type GameSnapshot = {
    score: number;
    lives: number; // 3 → 0, one per duck that flies away
    level: number; // the round, from 1 upwards
    shells: number; // 3 → 0, the only field of this game's own
};
```

What lives inside:

- **The state machine** `ready → playing ⇄ paused → over`. `start()` needs no asset gate: this
  cartridge loads nothing.
- **The loop.** `requestAnimationFrame` with `dt` capped to `MAX_DT`, stopped in `"paused"` and
  in `"over"`, and resetting its timestamp on resume so the first `dt` after a pause is 0.
- **The flush cycle.** A flush spawns `FLUSH.ducks` ducks at random columns in
  `[120, 680]`, at least `FLUSH.spawnGap` apart, both `rising` from `FIELD.grassY` to a random
  `cruiseY` in `[cruiseMin, cruiseMax]`, and refills `shells` to `FLUSH.shells`. The flush is
  resolved when no duck is `cruising` any more; after `FLUSH.gap` seconds the next one spawns.
  Five resolved flushes advance the round and multiply the speed by `ROUND.speedPerRound`.
- **The shot.** On `mousedown` with `button === 0` and `status === "playing"`: `shells -= 1`,
  and the topmost `cruising` duck whose `contains(px, py)` is true takes the hit — **one duck per
  shell**, never two. A hit adds `SCORE.perDuck` and sets the duck to `hit`. A miss adds
  nothing. When `shells` reaches 0, every duck still `cruising` becomes `fleeing` at once, which
  is what makes a wasted shell expensive.
- **The escape.** A duck that is `expired`, or one caught by the empty-shell sweep, becomes
  `fleeing` and costs one life. At zero lives the status goes to `"over"` immediately; the ducks
  already on screen finish their animation on the static frame.
- **The bonus.** A flush where both ducks ended `hit` adds `SCORE.perfectFlush` when it resolves.
- **The pointer.** `mousemove` on the canvas keeps the crosshair, converted through a **live**
  `getBoundingClientRect()`, because `.game-canvas` stretches the canvas over `.crt-screen` and
  the factor changes with the window — the same conversion BLOQUE BUSTER established. Listening
  to its own canvas is inside rule 1, not an exception to it, and `destroy()` removes both
  listeners.
- **The cursor.** `canvas.style.cursor = "none"` while `status === "playing"`, restored to `""`
  on pause, on `"over"` and in `destroy()`, so the native pointer is back for the end modal.
- **The keys.** `keydown` on `window`: `P` and `Esc` toggle pause, `Space` starts from
  `"ready"`. `preventDefault()` **only while `status === "playing"`**, and only on those keys:
  with the end modal open the status is `"over"`, so the initials input types normally, spaces
  included. `mousedown` also calls `preventDefault()` only while playing, so a drag over the
  canvas never starts a text selection.
- **Automatic pause** on `visibilitychange` when the tab is hidden. There is no accumulator to
  drain, but the flush timers and the ducks' `t` would otherwise be resumed against a stale
  timestamp, which the `dt` reset already covers.
- **The scaling.** `canvas.width = WORLD.w * dpr` with `dpr` capped at 2, then
  `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`, so the game always reasons in world coordinates and
  the vector ducks stay sharp.
- **A static frame in `"ready"` and in `"over"`** — field, crosshair, no ducks — so the overlay
  never sits on a black rectangle.
- **`snapshot` only when something changes**: on a shell spent, a hit, an escape, a resolved
  flush, a round change and on `restart()`. That is a handful of emissions a second at worst,
  never one per frame, and no field of this snapshot is continuous.
- **`destroy()`** cancels the `requestAnimationFrame`, removes the two canvas listeners and the
  two window listeners, and restores the cursor. Without it StrictMode's double mount leaves two
  loops running and the ducks fly at double speed.

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

| prop            | value                                                        |
| --------------- | ------------------------------------------------------------ |
| `game`          | the `ducks` row handed down by the route                     |
| `score`         | `snapshot.score`                                             |
| `lives`         | `snapshot.lives`, 3 → 0: hearts, one per duck that flew away |
| `level`         | `snapshot.level`, the round                                  |
| `extraStat`     | `{ label: "SHELLS", value: "2/3" }`, the shells left of three   |
| `paused`        | `status === "paused"`                                        |
| `over`          | `status === "over"`                                          |
| `onTogglePause` | `pause()` / `resume()`                                       |
| `onEnd`         | `end()`                                                      |
| `onRestart`     | `restart()`                                                  |
| `children`      | `<canvas className="game-canvas">` and the `ready` overlay   |

The component follows `bloque-buster-game.tsx` to the letter, because it is the other cartridge
that uses the pointer: the engine lives in a `useRef` and never in state, a `useEffect` with `[]`
dependencies creates it and calls `destroy()` in the cleanup, and
`matchMedia("(pointer: coarse)")` is read with `useSyncExternalStore` and never with a
`setState` inside an effect, or hydration breaks. With a coarse pointer it renders
`MOUSE REQUIRED` and the control list instead of the start overlay, and does not create the
engine.

---

## 4 — Implementation plan

Each step leaves the app building and the seven routes navigable.

1. **`app/lib/engines/ducks/constants.ts`.** The values of section 3.2, each block carrying the
   reason for its number, because there is no original to cite.
   Verify: `npx tsc --noEmit` clean, and `150 * 1.1 ** 14` evaluates to ≈ 569.6 px/s, the
   round-15 speed the ceiling of section 6 is built on.

2. **`app/lib/engines/ducks/entities.ts`.** `Duck`, `Crosshair` and `drawField` from section
   3.3, with `draw(ctx)` taking the context and `contains()` as the only collision code.
   Verify: `npx tsc --noEmit` and `npm run lint` with no warnings.

3. **`app/lib/engines/ducks/engine.ts`.** `createDucksEngine` with everything in section 3.4:
   the state machine, the capped loop, the flush cycle, the shot and its single-duck hit test,
   the escape and the lives, the perfect-flush bonus, the pointer conversion, the cursor
   handling, the keys with their conditional `preventDefault()`, the `visibilitychange` pause,
   the `dpr` scaling and `destroy()`.
   Verify: `npx tsc --noEmit` clean and `grep -rn 'from "react"' app/lib/engines` empty.

4. **`app/globals.css`.** The `.cover-ducks` block of section 3.1, appended inside the
   `NOT PART OF THE PORT` banner under a `SPEC 10` label. Nothing else in the file is edited,
   and no letterbox rule is added: the world is 4:3.
   Verify: `npm run format:check` passes and the eight existing cover generators are untouched
   in the diff.

5. **`app/components/ducks-game.tsx`.** A `"use client"` component modelled on
   `bloque-buster-game.tsx`:
    - creates the engine in a `useEffect` with `[]` and calls `destroy()` in the cleanup;
    - keeps `snapshot` and `status` in state and passes them to `<PlayerShell>` as in section
      3.6;
    - renders `<canvas className="game-canvas">` inside `.crt-screen` and, on top, the `"ready"`
      overlay: the title, the controls (`MOUSE` aim · `CLICK` fire · `P` pause) and
      `▸ CLICK TO START_`. The pause overlay and the end modal belong to the shell;
    - with a coarse pointer, shows `MOUSE REQUIRED` with the control list and does not start the
      engine;
    - wires `FIN` to `end()`, `PAUSA` to `pause()`/`resume()` and `JUGAR DE NUEVO` to
      `restart()`.

    Verify: `/games/ducks/play` opens stopped, a click starts the first flush, and downing a duck
    moves the score and `SHELLS` in the HUD.

6. **`app/components/game-registry.ts`.** The `dynamic()` and the `ducks` entry of section 3.5.
   Verify: `/games/ducks/play` mounts the real game; the other four engineless cartridges still
   land on `fake-game-player.tsx`, and their route bundles pull no engine.

7. **The database step.** Write
   `supabase/migrations/<timestamp>_add_ducks_cartridge.sql` with the `alter table` and the
   `insert` of section 3.1 — confirming the constraint name with the `pg_constraint` query
   first — apply it with `apply_migration` under the description `add_ducks_cartridge`, rename
   the local file to the timestamp `list_migrations` reports so the repository and the remote
   registry tell the same story, and regenerate `app/lib/supabase/types.ts` with
   `generate_typescript_types`.
   In the same step, add `| "cover-ducks"` to the `CoverArt` union in `app/lib/games.ts`: the
   three coordinated changes of the ninth cover art land together with step 4.
   Verify: `select id, cat, cover, sort_order, max_score from public.games order by sort_order`
   returns nine rows with `ducks` last, `insert … values ('x', …, 'cover-nope', …)` is rejected
   by the constraint, and the regenerated `types.ts` shows **no** diff.

8. **The documentation.** `CLAUDE.md`: the cartridges that really play go from four to
   **five** — ASTEROIDES, CAÍDA, BLOQUE BUSTER, SNAKE and DUCKS — the catalogue holds nine rows,
   four of which still show the mock of SPEC 01, `app/lib/engines/ducks/` joins the engine
   convention as the first cartridge whose mouse **fires**, and the naming convention is
   recorded: new cartridges are named, labelled and documented in English, while the four
   shipped ones keep their Spanish ids. `references/implemented-games.md`: a fifth per-cartridge
   section, the two summary tables, the `Not implemented yet` list down to three rows, and a new
   `Last checked` date.
   Verify: neither file still claims that four cartridges play or that the catalogue has eight
   rows.

9. **Final verification.** `npm run build`, `npm run lint` and `npx tsc --noEmit`. Walk the seven
   routes (`/`, `/games`, `/games/[id]`, `/games/[id]/play`, `/login`, `/hall-of-fame`,
   `/about`) checking that the only change is a ninth card at the end of the library, and play a
   full run through to saving the mark.

---

## 5 — Acceptance criteria

The fixed block every cartridge inherits, translated into English with its checks unchanged.
The strings in quotes are the shell's own UI and stay in Spanish, because `PlayerShell` is not
this spec's to translate:

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

- [ ] `/games` shows **nine** cards and the last one reads `DUCKS`, with the yellow `JUGAR`
      button and the new cover art. The home rail still shows the first six games and the
      counter reads `9+`.
- [ ] `/games/ducks` and `/games/ducks/play` load, and the detail page shows `SHOOTER`.
- [ ] A run opens with the HUD at score 0, three hearts, round `01` and `SHELLS 3/3`.
- [ ] Each flush releases exactly two ducks, at least 90 px apart, and refills the shells to 3.
- [ ] Every click spends one shell, hit or miss, and the HUD drops to `2/3`, `1/3`, `0/3`.
- [ ] One shell can down at most one duck: a click on two overlapping ducks resolves the
      topmost one only.
- [ ] Downing a duck adds exactly 500 points; a flush with both ducks down adds a further 1 000
      when it resolves.
- [ ] Spending the third shell with a duck still cruising makes that duck fly away at once and
      costs a life.
- [ ] A duck not shot within 5.5 seconds climbs away and costs a life, and it cannot be shot
      once it is climbing.
- [ ] The third duck that flies away ends the run and opens the modal, whatever the round.
- [ ] After five flushes the round counter reads `02` and the ducks visibly fly faster.
- [ ] A duck reaching either side wall turns instead of leaving the sky.
- [ ] The crosshair follows the pointer with no offset at any window size, and after resizing
      the window it still lands where it is drawn.
- [ ] The native cursor is hidden over the canvas during a run and comes back on pause and with
      the modal open.
- [ ] On a coarse-pointer device the cartridge shows `MOUSE REQUIRED` and does not start the
      engine.
- [ ] `select count(*) from public.games` returns 9, and inserting a row with an unknown
      `cover` is still rejected by `games_cover_check`.
- [ ] `app/lib/supabase/types.ts` does not change after regenerating it.

---

## 6 — Decisions taken and discarded

This spec was written without a question round, so every decision `/add-game` would have asked
about is taken here with its reason, discarded options included.

**On the game the theme became**

- **Yes:** a Duck Hunt-style shooting gallery. It is the classic a player recognises behind
  «ducks», it is the cheapest engine in the SHOOTER bucket — sinusoidal paths, no
  entity-to-entity collision, one point-in-rect per click — and it fits the SPEC 05 contract
  with no asset, no network and no physics library.
- **No:** ducks flying in rows over a cannon. That is Space Invaders with a duck skin, and
  `references/game-suggestions-todo.md` already recommends `invasores` as the fifth cartridge.
  A repaint of a queued game is not a new game.
- **No:** a duck crossing a road or a river. That is Frogger, which is what the `ranaria` row
  promises.
- **No:** anything 3D, online or asset-heavy. The contract is a fixed 800×600 world, keyboard
  and mouse, and few or no binary assets.

**On the language of the cartridge**

- **Yes:** the id is `ducks`, the title is `DUCKS`, the engine folder is
  `app/lib/engines/ducks/` and the HUD label is `SHELLS`. All the copy this spec introduces —
  card text, overlays, control labels — is English. It is the repository's new convention: code,
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
- **Yes:** the `app/lib/games.ts` edit, and **only** that one line. It is the single exception the
  `/add-game` contract grants to the never-touch list, it adds a string to a union, and no other
  file on that list is opened.
- **Yes:** `.cover-ducks` under the `NOT PART OF THE PORT` banner and not beside the other eight
  generators. `app/globals.css` is a verbatim port of the reference template, and anything added
  outside it belongs in that banner in a labelled block.
- **Yes:** `cat = SHOOTER`. A gallery is a shooter, and it takes the category from two rows to
  three of nine.
- **Yes:** `color = yellow`. The duck beak and the dusk sky of the cover art are yellow, and the
  `JUGAR` button should match the card it sits on.
- **Yes:** `plays = '0'`. The column is a display string, not a counter, and a brand-new
  cartridge has been played zero times. Inventing a `14.2K` for a game nobody has opened is the
  one lie the seeded rows can afford and a new row cannot.
- **No:** seeding scores for `ducks`. SPEC 06 seeded only ASTEROIDES because it was the only game
  that really played; an empty board is the truth here too.

**On the scoring and the ceiling**

- **Yes:** 500 points a duck, flat, with no round multiplier. It keeps the arithmetic of the
  ceiling readable and it puts the pressure on the shells rather than on surviving to a fatter
  round.
- **Yes:** a 1 000-point bonus for a flush where both ducks fall. It is what makes the third
  shell worth saving, and it doubles the value of a clean flush without touching the per-duck
  price.
- **No:** `perDuck × round`, the SNAKE and CAÍDA shape. It would make round 12 worth twelve times
  round 1 and turn the ceiling into a guess, and this take already grows in difficulty through
  speed.
- **No:** a streak multiplier. That is the other variant's scoring axis, and having both would
  make the two specs the same game with different palettes.
- **Yes:** `max_score = 150000`. A perfect round is `10 × 500 + 5 × 1000 = 10 000` points, so
  150 000 is **fifteen consecutive perfect rounds**. On round 15 the cruise speed is
  `150 × 1.10¹⁴ ≈ 570 px/s`, which crosses the 680 px flight band in 1.2 seconds while weaving,
  and 10 out of 10 at that speed with three shells a flush is beyond a human. Realistic top runs
  die around rounds 7 to 9, which is 60 000 to 80 000, so the ceiling is roughly 1.9× the best
  plausible mark.
- **No:** the seeded default of 10 000 000. `max_score` is the only real guard on the table —
  RLS lets anyone insert and there is no identity until the auth spec — and the default lets
  through anything.
- **No:** `50000`. Five perfect rounds is reachable by a good player, and a ceiling a legitimate
  run bounces off is a bug.
- **No:** `1000000`. It accepts marks the game cannot produce.

**On the HUD**

- **Yes:** `lives` carries the three lives, one per duck that flies away. It is the one field
  `PlayerShell` draws as hearts, and losing a life to a duck escaping is the run's real
  currency.
- **No:** shells in `lives`. Three hearts labelled `Vidas` that refill every flush would name
  ammunition as life, and the label belongs to the shell, which is not ours to edit.
- **Yes:** `level` carries the round. The round **is** the difficulty: each one multiplies the
  speed by 1.10, so the number and the feeling move together.
- **Yes:** `extraStat = { label: "SHELLS", value: "2/3" }`. There is exactly one extra slot and
  the shells are what changes on every click; the format shows the budget, not just the
  remainder.
- **No:** `HITS n/10` in that slot. Round progress is slower and less urgent than ammunition,
  and it is legible from the sky anyway.
- **No:** a round quota — «down 6 of 10 to advance», the cabinet's real fail state. It needs a
  second extra slot to be fair, and `PlayerShell` has one; and a run that ends because a counter
  fell short feels administrative next to a duck escaping in front of you.
- **No:** drawing the spent shells or the duck strip inside the canvas the way the cabinet does.
  Rule 2 of the contract forbids any HUD inside the canvas, and the shells already travel in the
  snapshot.

**On the controls**

- **Yes:** mouse only. The pointer aims, the left button fires, and this is the first cartridge
  where the mouse **fires** rather than moving something. In a light-gun game the pointer is the
  instrument.
- **Yes:** the pointer converted through a **live** `getBoundingClientRect()`, as SPEC 08
  established, because `.game-canvas` stretches the canvas over `.crt-screen` and the factor
  changes with the window.
- **Yes:** `mousedown` rather than `click`, so the shot fires on the press and the recoil lines
  up with the finger.
- **Yes:** `preventDefault()` on `mousedown` and on the game's keys **only while
  `status === "playing"`**. With the end modal open the status is `"over"`, so the initials input
  types normally, spaces included, and a drag over the canvas never starts a text selection.
- **Yes:** `P` and `Esc` pause, `Space` or a click starts from `"ready"`. It matches the four
  cartridges already shipped.
- **Yes:** the native cursor hidden with `canvas.style.cursor = "none"` while playing, and
  restored on pause, on `"over"` and in `destroy()`. An arrow next to a crosshair is two
  pointers; an invisible cursor over an open modal is a bug.
- **No:** a keyboard aiming fallback. A scope moved with the arrows is a different game with a
  different difficulty knob, and it is the whole point of the other variant of this jam.
- **No:** touch controls. With a coarse pointer the cartridge shows `MOUSE REQUIRED` and does not
  start the engine, the same shape ASTEROIDES uses.

**On the rules**

- **Yes:** flushes of two ducks with three shells, the cabinet's own budget. It is the
  arithmetic that makes a wasted shot hurt.
- **Yes:** running out of shells sends every duck still cruising away immediately. Without it the
  empty gun would just be a wait, and the flush's tension would leak out of it.
- **Yes:** a duck that is not shot within 5.5 seconds climbs away, which is how the original
  ends a flight. It also makes a round's length predictable, which is what lets the ceiling be
  computed at all.
- **Yes:** a fleeing duck cannot be shot, and the life is spent the instant it starts climbing.
  Instant feedback, and one less state the hit test has to consider.
- **Yes:** ducks turn at the side walls instead of leaving through them. Otherwise the flight
  time would be decorative: a duck would exit in two seconds at round 8.
- **Yes:** one duck per shell. The hit test resolves the topmost duck only; a spread that could
  take both would make the three-shell budget meaningless.
- **Yes:** three lives per **run**, not per round. Three per round is nine per three rounds and
  the game stops ending; per run is what keeps the run finite and the ceiling honest.
- **Yes:** the fall and the climb are cosmetic. Score and lives resolve on the state change, so
  the snapshot never waits for an animation.
- **Yes:** `MAX_DT = 0.05`, not BLOQUE BUSTER's 0.02. Nothing here sweeps against anything: the
  only test is point-in-rect at the instant of a click, against a position already on screen.
- **Yes:** `restart()` resets score, lives, round, speed, shells and the duck list, drops back to
  `"ready"` and redraws the static frame. It is the same reset `start()` starts from, so there is
  one code path and not two.
- **Yes:** the run ends with `"over"` and nothing else. `PlayerShell` knows `over`, and it has no
  idea of a victory screen — the same decision SPEC 08 and SPEC 09 took.

**On the assets**

- **Yes:** vector ducks drawn with canvas primitives. It is the same call SPEC 07 and SPEC 08
  made when they dropped their originals' spritesheets, and a silhouette with a flapping wing
  reads better in the CRT frame than a 32 px sprite would.
- **No:** a sprite sheet. It would bring back the loading gate SPEC 09 built, and here the asset
  is decoration, not the game — which is exactly the line SPEC 09 drew.
- **No:** audio. A shot and a quack are tempting and they are the start of platform audio: a
  remembered mute and a control in `PlayerShell`. BLOQUE BUSTER stays the only cartridge that
  makes a sound.
- **No:** the dog. The laugh is the most memorable thing about the original and it is a sprite, a
  cutscene and an animation budget that buys nothing in the score loop.

---

## 7 — Identified risks

| Risk                                                                                        | Mitigation                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| StrictMode mounts twice and leaves two loops running, so the ducks fly at double speed      | `destroy()` is part of the contract and the mounting `useEffect` calls it in its cleanup. There is an acceptance criterion for it.                                                              |
| `preventDefault()` swallows the initials input in the end modal                             | It is called only while `status === "playing"`; with the modal open the status is `"over"`. The criterion types a name with a space in it.                                                      |
| Coming back from another tab jumps the ducks forward                                        | `dt` is capped at `MAX_DT` and `visibilitychange` pauses the run; the loop resets its timestamp on resume, so the first `dt` is 0.                                                              |
| The crosshair drifts from the pointer because `.game-canvas` scales the canvas              | The conversion reads a **live** `getBoundingClientRect()` on every move, the shape SPEC 08 established, and a criterion checks it after a window resize.                                        |
| `cursor: none` leaves the pointer invisible over the end modal                              | The cursor is hidden only while `status === "playing"` and restored on pause, on `"over"` and in `destroy()`.                                                                                   |
| The three coordinated changes of the ninth cover art drift apart                            | Steps 4 and 7 land together and the verification of step 7 rejects an unknown `cover` and diffs the regenerated types. A missing CSS rule shows as a blank card on `/games` in the final walk.  |
| The `games` tag caches the catalogue, so the ninth card does not appear after the migration | `getGames` is cached under the `games` tag; a saved score revalidates it, and a dev-server restart does too. Step 7 verifies against the database with `select`, not against the page.          |
| Nine cards break the library grid                                                           | `.games-grid` is `repeat(auto-fill, minmax(280px, 1fr))`, so the ninth card wraps. The home rail slices to `PREVIEW_COUNT = 6` and `ducks` sorts last, so the rail does not change.             |
| Three lives per run makes for very short games                                              | It is deliberate: the arcade take is meant to be tense. The knobs, if it plays too harshly, are `RUN.lives` and `DUCK.flightTime`, both isolated in `constants.ts` and both named in section 6. |
| A duck spawning under the crosshair gets shot with no aiming                                | Ducks spawn in the grass at `y = 470` and rise; the sky band starts at 90 and the crosshair rests wherever the player left it. Spawn columns are also at least 90 px apart.                     |

---

## 8 — What is **not** in this spec

- **Sound.** DUCKS is silent. BLOQUE BUSTER stays the only cartridge that makes a noise, and
  platform audio — a remembered mute, a control in `PlayerShell`, silencing the other engines —
  is its own spec.
- **The dog**, its laugh and any cutscene.
- **Touch controls.** With a coarse pointer the cartridge shows `MOUSE REQUIRED`.
- **A keyboard aiming fallback.** This take is mouse-only.
- **A round quota, a bonus round, clay pigeons and duck species with different prices.**
- **Renaming the four shipped cartridges** to English ids or labels, and translating
  `PlayerShell`.
- **A local record or a board inside the cartridge.** No `localStorage`: the mark is saved
  through `PlayerShell` and the ranking is the one from SPEC 06.
- **The four cartridges that still have no engine** — `gloton`, `invasores`, `ranaria`,
  `duelo-pixel` — which keep `fake-game-player.tsx`.

Each of those, if it lands, goes in its own spec.
