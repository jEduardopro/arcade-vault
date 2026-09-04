---
name: add-game
description: Designs the SPEC for adding a playable game to Arcade Vault, wired to the Supabase leaderboard. It writes a spec and nothing else — no game code, no migration, no database write. Detects whether the game comes from references/started-games/, asks the questions SPEC 05 and SPEC 06 had to answer, and saves specs/NN-slug.md for /spec-impl to build.
disable-model-invocation: true
argument-hint: "game name, or a folder under references/started-games/"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(wc:*), mcp__supabase__list_tables, mcp__supabase__list_migrations, mcp__supabase__execute_sql
---

# /add-game — Spec designer for a new Arcade Vault cartridge

**This command produces a spec. It does not build the game.** The name is an action, and the
action is "add a game to the roadmap", not "add a game to the app". You write exactly one
file: `specs/NN-slug.md`. `/spec-impl` is what writes the engine, the component and the
migration afterwards.

## Session context

Today's date (use this for the spec header, never guess it):
!`date +%F`

Specs that already exist:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist yet"`

Vanilla games available as source material:
!`ls references/started-games/ 2>/dev/null || echo "There is no references/started-games/ folder"`

Engines already ported:
!`ls app/lib/engines/ 2>/dev/null || echo "No engine has been ported yet"`

Which cartridges are plugged into the player screen:
!`cat app/components/game-registry.ts 2>/dev/null || echo "app/components/game-registry.ts does not exist"`

Migrations applied so far:
!`ls supabase/migrations/ 2>/dev/null || echo "There are no migrations yet"`

Files of the `/spec` skill, which owns the format of every spec in this repo:
!`ls .agents/skills/spec/ 2>/dev/null || ls .claude/skills/spec/ 2>/dev/null || echo "The /spec skill is not installed — see the rule below"`

---

This skill turns "I want Tetris in the Vault" into a spec that someone can implement without
re-deriving decisions that SPEC 05 and SPEC 06 already took. Those two specs established a
repeatable recipe — the engine/React boundary, the eight files a cartridge touches, the
database constraints the catalogue row must satisfy — and this file carries that recipe so
each new game spec inherits it instead of reinventing it.

## This skill does not own the spec format — `/spec` does

There is a clean division of labour, and keeping it is what stops the two skills from
drifting apart:

- **`/spec` owns the document.** Its shape, the eight sections, the header blockquote, the
  valid states, the numbering, the slug, the save rules and the writing style. That
  knowledge lives in `.agents/skills/spec/SKILL.md` and `.agents/skills/spec/template.md`,
  and it is the single source of truth.
- **`/add-game` owns the subject.** What a cartridge costs, the engine contract, the
  database constraints, and the questions a game needs answered before anyone writes code.

So this skill never restates the spec format from memory. **Before writing anything, read
both files of the `/spec` skill** — Phase 4 makes it a required step — and follow them for
everything about the document. Whatever those files say about structure and saving wins
over any example shown here; the fragments in Phase 4 below are a reminder of what this
repo's specs look like today, not a competing definition.

If the `/spec` skill is missing from the session context above, say so and ask whether to
continue from this repo's existing specs alone. Do not invent a format.

Your replies must be in the same language as the initial prompt. If the prompt is in
Spanish, answer in Spanish.

## What a cartridge costs

Every playable game touches the same surfaces. A spec that omits one of these is incomplete.

| #   | Path                                  | Action                                                              |
| --- | ------------------------------------- | ------------------------------------------------------------------- |
| 1   | `app/lib/engines/<game>/constants.ts` | new — every tuning number, plus the `PALETTE`                       |
| 2   | `app/lib/engines/<game>/entities.ts`  | new — the classes, with `draw(ctx)` and `update(dt)`                |
| 3   | `app/lib/engines/<game>/engine.ts`    | new — `create<Game>Engine(canvas, on): EngineHandle`                |
| 4   | `app/components/<game>-game.tsx`      | new — `"use client"`, default export, renders `<PlayerShell>`       |
| 5   | `app/components/game-registry.ts`     | edit — one `dynamic()` import and one map entry                     |
| 6   | `app/globals.css`                     | edit **only** if the world is not 4:3, under `NOT PART OF THE PORT` |
| 7   | `supabase/migrations/<ts>_*.sql`      | only if the catalogue row is new or `max_score` changes             |
| 8   | `CLAUDE.md`                           | edit — the "ASTEROIDES is the only one that really plays" claim     |

What a game must **never** touch: `player-shell.tsx`, `game-player.tsx`, `app/lib/games.ts`,
`app/lib/catalogue.ts`, `app/lib/scores.ts`, `app/lib/leaderboard.ts`,
`app/actions/scores.ts`, `app/lib/rate-limit.ts`, and the two page routes. The leaderboard
comes free: the moment the game id exists in `public.games` and the cartridge renders
through `PlayerShell`, saving a score, the Hall of Fame and the detail panel all work with
no extra wiring. If a spec proposes editing any of those files, it has misunderstood the
architecture — challenge it before writing it down.

## The engine contract

Four rules make an engine reusable. They come from SPEC 05 and are enforced by an acceptance
criterion, not by a type. Every game spec restates them.

1. **The engine never imports React**, and knows no DOM beyond its own canvas and the
   `window` it listens to for keys. `grep -rn 'from "react"' app/lib/engines` must stay
   empty.
2. **The engine draws no HUD and no overlays.** Whatever the original drew with
   `drawHUD()`, `drawLifeIcon()` or `drawOverlay()` is deleted; that information travels
   through the `snapshot` callback and React paints it.
3. **`snapshot` is emitted only when a value changes**, never once per frame. Sixty
   `setState` per second to repaint a number that changes twice a minute is the bug this
   rule exists to prevent. A continuously changing value (a countdown) is rounded to one
   decimal first.
4. **`destroy()` is part of the contract.** The mounting `useEffect` calls it in its
   cleanup, or StrictMode's double mount leaves two loops running and the game plays at
   double speed.

The types the new engine exposes, matching `app/lib/engines/asteroides/engine.ts`:

```ts
export type GameStatus = "ready" | "playing" | "paused" | "over";

export type GameSnapshot = {
    score: number;
    lives: number;
    level: number;
    // plus at most one game-specific field, if the HUD needs an extra stat
};

export type EngineHandle = {
    start(): void; // "ready" → "playing"
    pause(): void;
    resume(): void;
    end(): void; // forced game over, from the FIN button
    restart(): void; // back to "ready" with a fresh field drawn
    destroy(): void; // cancels the loop and removes every listener
};

export type EngineCallbacks = {
    snapshot: (snapshot: GameSnapshot) => void;
    status: (status: GameStatus) => void;
};
```

Three details that are easy to get wrong and belong in the spec:

- **Scaling.** `canvas.width = WORLD.w * dpr` with `dpr` capped at 2, then
  `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`, so the game keeps reasoning in world
  coordinates and vector art stays sharp on dense screens.
- **`preventDefault()` only while `status === "playing"`.** This is what keeps the
  initials input in the end modal typable: with the modal open the status is `"over"`, so
  the space bar types a space instead of firing.
- **Clear the held-keys set on pause.** A key held when the tab is hidden never sends its
  `keyup`, and the ship would thrust forever on resume.

The cartridge component follows `app/components/asteroides-game.tsx`: the engine lives in a
`useRef` (never in state — re-rendering must not build a second one), a `useEffect` with an
empty dependency array creates it and destroys it, and external browser state such as
`matchMedia("(pointer: coarse)")` is read with `useSyncExternalStore`, never with `setState`
inside an effect, or hydration breaks.

It renders `<PlayerShell>` with exactly these props: `game`, `score`, `lives`, `level`,
`extraStat` (`{ label, value }` or `null`), `paused`, `over`, `onTogglePause`, `onEnd`,
`onRestart`, and the canvas as `children`. **A game with no lives passes `0`** — the shell
renders `—`. A game with no levels passes `1`. Do not add props to the shell.

## The catalogue and the leaderboard

The facts a spec must not get wrong, all enforced by `CHECK` constraints in
`supabase/migrations/`:

- `public.games.id` must match `^[a-z0-9-]{2,40}$` and is the URL slug.
- `cat` ∈ `ARCADE` | `PUZZLE` | `SHOOTER` | `VERSUS`.
- `cover` ∈ the **eight fixed classes** and no others: `cover-bricks`, `cover-tetro`,
  `cover-snake`, `cover-glot`, `cover-invaders`, `cover-rocas`, `cover-rana`, `cover-duelo`.
- `color` ∈ `cyan` | `magenta` | `yellow` | `green`.
- `max_score` defaults to `10000000`. It is the per-game ceiling the save action enforces,
  so a spec should size it to what the game can realistically reach.
- `public.scores.player` must match `^[A-Z0-9_]{1,10}$`; `score` is an integer between 0 and
  10 000 000. RLS allows anonymous `select` and `insert`, and nothing else: a saved row is
  immutable from the API.
- Seeds use `on conflict do nothing`, so any seeded row needs a **literal id** — a
  `gen_random_uuid()` primary key can never conflict and re-applying would duplicate.

**A ninth cover art costs three coordinated changes**: an `alter table` dropping and
re-adding the `CHECK`, a new `.cover-*` rule in `app/globals.css`, and a new member of the
`CoverArt` union in `app/lib/games.ts`. Either avoid it by reusing a free cover, or plan all
three in the spec. Never write a `cover` value that is not in the list above.

The catalogue already holds eight rows. The mapping that decides whether a migration is
needed at all:

| Reference game | Catalogue row   | sort | cat     | cover          | color   | state          |
| -------------- | --------------- | ---- | ------- | -------------- | ------- | -------------- |
| `04-arkanoid`  | `bloque-buster` | 0    | ARCADE  | cover-bricks   | cyan    | not ported yet |
| `03-tetris`    | `caida`         | 1    | PUZZLE  | cover-tetro    | magenta | not ported yet |
| —              | `serpentina`    | 2    | ARCADE  | cover-snake    | green   | not ported yet |
| —              | `gloton`        | 3    | ARCADE  | cover-glot     | yellow  | not ported yet |
| —              | `invasores`     | 4    | SHOOTER | cover-invaders | green   | not ported yet |
| `02-asteroids` | `asteroides`    | 5    | SHOOTER | cover-rocas    | yellow  | **ported**     |
| —              | `ranaria`       | 6    | ARCADE  | cover-rana     | green   | not ported yet |
| —              | `duelo-pixel`   | 7    | VERSUS  | cover-duelo    | cyan    | not ported yet |

Confirm this table against the live database in Phase 2 rather than trusting it — it is a
snapshot, and the database is the authority.

Saving a score needs nothing per game: `PlayerShell` posts `gameId`, `score` and `player` to
the `submitScore` action, which validates, applies the per-IP quota, inserts, and
revalidates the `games` tag plus the two routes that show boards.

## Phases

Follow them in order. Phase 3 is the point of the command — do not skip it.

### Phase 1 — Locate the source

Look at `$ARGUMENTS` and at the `references/started-games/` listing in the session context.

**If the game has source material there**, read it before asking anything: `game.js`, plus
`README.md` and `CLAUDE.md` if the folder has them. Inventory, because each item becomes a
decision in the spec:

- The world size, and whether it fits `.crt-screen`'s 4:3 ratio.
- The module globals that must become closure state inside `create<Game>Engine`.
- The DOM handles it reads — `getElementById`, HUD spans, overlay divs, restart buttons —
  and what replaces each one.
- Everything drawn inside the canvas that rule 2 forbids: HUD, overlays, in-canvas menus.
- Binary assets: sprite sheets, audio. They move under `public/` and need a ready gate
  before the first frame; audio also needs a user gesture.
- The loop style: a pure `dt` loop ports directly, an accumulator loop needs care when
  capping `dt`.
- Dead weight that must not be ported: theme toggles, `localStorage` keys, level pickers
  drawn on the canvas.

**If there is no source material**, do not guess. Ask with `AskUserQuestion`:

- **(a)** The user supplies the source — a local path, a URL, or code pasted into the chat.
- **(b)** The engine is designed from scratch in TypeScript, against the same contract.

Record whichever branch was chosen as a closed decision in section 6 of the spec, so the
implementation does not reopen it.

### Phase 2 — Read the catalogue

Read `supabase/migrations/*.sql` for the schema and the seeds, then confirm the live state,
**read-only**:

```sql
select id, title, cat, cover, color, sort_order, max_score
from public.games order by sort_order;

select game_id, count(*) as marks, max(score) as best
from public.scores group by game_id;
```

Then decide, and say so in the spec:

- **Reuse an existing row** — the common case for a reference game. No migration at all.
- **Update an existing row** — usually only `max_score`, and sometimes the copy if the
  invented card no longer describes the real game. One `update` migration.
- **Insert a new row** — a game with no matching cartridge. It needs the next free
  `sort_order`, a free cover from the eight, and a literal id matching the slug regex.

### Phase 3 — Clarify through questions

Ask in blocks of 3 to 5 with `AskUserQuestion`, waiting for the answers before the next
block. Offer 2–4 options, put your recommendation first and say why. Be direct; do not
apologise for asking.

The bank of questions worth asking, grouped:

- **Catalogue identity.** Which row does this game take? Does its copy, `cat`, `cover` or
  `color` change? What is a realistic `max_score`?
- **The HUD.** What feeds `score`, `lives` and `level`? If the game has no lives or no
  levels, what goes in their place? Is there an extra stat worth an `extraStat`, and what
  are its label and format?
- **Controls.** Which keys, and which of them need `preventDefault()` while playing? Does
  the game need the mouse, and does that survive inside the CRT frame?
- **The world.** What are its dimensions? If it is not 4:3, does it letterbox inside
  `.crt-screen` or does the spec add a CSS block under `NOT PART OF THE PORT`?
- **Assets.** Sprites or audio? Where do they live, how does the engine wait for them, and
  is audio muted by default?
- **What gets dropped.** Which parts of the original disappear because the platform already
  provides them — pause overlay, end screen, restart button, level picker, theme toggle.
- **Run lifecycle.** What does `restart()` reset? Does the game start on a key press or on a
  button? What ends a run?
- **Scope cuts.** What is tempting but deferred to another spec?

Stop asking when you can answer, without assuming: which files appear or change, what the
first and last executable steps are, and how to verify the game is finished.

### Phase 4 — Write the spec

**Read these three sources before writing a single line. This is a required step, not a
suggestion:**

1. **`.agents/skills/spec/SKILL.md`** — the `/spec` skill itself. It defines how a spec is
   built and saved in this repo: the section order, what belongs in each one, the common
   mistakes, and the rules of its own Phase 4 (numbering, slug, `Draft` state, checking that
   the declared dependencies really exist, seeding `specs/.spec-config.yml` when it is
   missing, and the confirmation message). Apply all of it here — this command is `/spec`
   specialised for games, not a second, parallel way of writing specs.
2. **`.agents/skills/spec/template.md`** — the shape each section must respect, with its
   anti-patterns: unverifiable acceptance criteria, decisions with no reason, TODOs, long
   executable code, vague names.
3. **The two most recent specs in `specs/`** — the conventions actually in use: the
   language, the exact wording of the states and the headings.

Where the three disagree, `/spec` and its template win on **format**, and the existing specs
win on **language and wording**. This file wins only on the **content** of a game spec: the
engine contract, the touch list, the database constraints and the fixed acceptance criteria.

Today those sources produce a document in Spanish with these eight headings. Treat the block
below as what you should expect to find, and correct it against what you actually read:

```
# SPEC NN — <título corto>

> **Estado:** Draft
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** <from the session context>
> **Objetivo:** <one sentence>

## 1 — Por qué existe este spec
## 2 — Alcance
## 3 — Modelo de datos
## 4 — Plan de implementación
## 5 — Criterios de aceptación
## 6 — Decisiones tomadas y descartadas
## 7 — Riesgos identificados
## 8 — Lo que **no** entra en este spec
```

`**Depende de:** SPEC 05, SPEC 06` always, because every game inherits the engine contract
from one and the leaderboard from the other. Add the source spec if there is one.

Section 3 always names the three engine files, the cartridge component, the registry entry
and the catalogue row, with the concrete constants and the `GameSnapshot` shape this game
needs. Section 4 follows the order SPEC 05 proved, each step leaving the app building and
the seven routes navigable:

1. `constants.ts` — every tuning number, plus the `PALETTE` mirroring the `:root` tokens.
2. `entities.ts` — the classes, with `draw(ctx)` and input passed in.
3. `engine.ts` — the state machine, the loop, the listeners, the scaling, `destroy()`.
4. `app/globals.css` — only if the world is not 4:3.
5. `app/components/<game>-game.tsx` — the cartridge and its overlays.
6. `app/components/game-registry.ts` — the one line that plugs it in.
7. The database step — only when the row is new or `max_score` changes: write the migration
   under `supabase/migrations/`, apply it with `apply_migration`, rename the local file to
   the timestamp `list_migrations` reports, and regenerate
   `app/lib/supabase/types.ts`.
8. `CLAUDE.md` — update the claim about which cartridges really play.
9. Final verification.

Section 5 always includes the fixed block below, plus criteria specific to this game's
mechanics. Section 6 records every decision taken in Phases 1 to 3, including the ones
discarded and why.

### Phase 5 — Save and stop

**Follow the save phase of `.agents/skills/spec/SKILL.md`**, which you read in Phase 4. It
is the authority on this step, and it covers the numbering, the slug, the date, the `Draft`
state, verifying that the declared dependencies exist in `specs/`, seeding
`specs/.spec-config.yml` only when it is missing, and the wording of the confirmation.

What this command adds on top of it:

- The slug names the game, in the language of the existing specs — `07-juego-tetris`, not
  `07-game-spec`.
- The dependencies to verify are at least `SPEC 05` and `SPEC 06`.
- The next step you announce is `/spec-impl NN-slug`.
- **Stop there.** Do not offer to implement it, do not write code, do not touch the
  database.

## Fixed acceptance criteria

Every generated spec inherits this block, adapted only in the game id. They are the ones
that catch the failures that are silent otherwise.

```markdown
- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `grep -rn 'from "react"' app/lib/engines` no devuelve nada.
- [ ] No hay ni un texto dibujado dentro del canvas: el HUD lo pinta `PlayerShell`.
- [ ] Con StrictMode montando dos veces, la partida no va al doble de velocidad.
- [ ] Salir de la ruta deja de consumir CPU: no queda ningún `requestAnimationFrame` vivo.
- [ ] Durante la partida las teclas del juego no hacen scroll; con el modal abierto, el
      input de iniciales escribe con normalidad, espacios incluidos.
- [ ] Cambiar de pestaña pausa la partida sola, y al reanudar la nave no se teletransporta.
- [ ] Terminar una partida, escribir un nombre y pulsar `GUARDAR PUNTUACIÓN` inserta una
      fila en `public.scores` y muestra `▸ PUNTUACIÓN GUARDADA_`.
- [ ] Esa marca aparece en `/hall-of-fame` y en el panel lateral de `/games/<id>` sin
      esperar ningún intervalo, y el récord de la ficha se actualiza tras revalidar `games`.
- [ ] Los demás cartuchos siguen cayendo en `fake-game-player.tsx`, sin cambios.
- [ ] La consola del navegador no registra errores ni avisos de hidratación.
```

## Hard rules

- **Never write code.** The only file you create is `specs/NN-slug.md`. No engine, no
  component, no migration, no `CLAUDE.md` edit — those are `/spec-impl`'s job.
- **Never write the spec without having read `/spec` first.** Both
  `.agents/skills/spec/SKILL.md` and `.agents/skills/spec/template.md`, in Phase 4, every
  time. This command is `/spec` specialised for games; it does not carry its own copy of the
  format, and a format reproduced from memory is how the two drift apart. If those files are
  missing, say so and ask before continuing.
- **Supabase is read-only here.** Only `select`. Never `insert`, `update`, `delete`,
  `create`, `alter` or `drop`, not even to "try it out". A spec describes the migration; it
  does not apply it.
- **Never invent a `cat`, `cover` or `color`** outside the closed lists. If the game needs a
  new cover, plan the three coordinated changes explicitly.
- **Never propose implementing the spec after saving it.** Your job ends at the
  confirmation.
- **Never assume a decision the user did not confirm.** Ask in Phase 3, which is where the
  questions belong.
- **The spec is written in the language of the existing specs** (Spanish today). This file
  stays in English, like `spec/SKILL.md` and `spec-impl/SKILL.md`.
- **Do not touch `skills-lock.json`.** It belongs to the `npx skills` CLI, and this skill is
  hand-written and project-local.
- **If the game is too big for one spec** — two games at once, or a game plus a platform
  feature such as touch controls or realtime boards — propose splitting before continuing.

## Arguments

`$ARGUMENTS` is the game: a name (`tetris`, `pong`) or a folder under
`references/started-games/` (`03-tetris`). Use it in Phase 1 to decide whether source
material exists.

If it comes in empty, ask which game before anything else, and whether it has source code
available.
