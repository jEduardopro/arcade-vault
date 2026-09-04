-- SPEC 06 — The catalogue and the scores, step 1: the two tables.
--
-- Applied with the `apply_migration` tool of the Supabase MCP server under this
-- same file name, so the remote registry and this repository tell the same
-- story. The schema is never edited from the application: `games` has no write
-- policy at all, and `scores` only accepts inserts.

-- The catalogue. The primary key is the slug already in the URLs, so
-- /games/asteroides keeps working without translating any id.
create table public.games (
    id          text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
    title       text        not null,
    short       text        not null,
    long        text        not null,
    cat         text        not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
    cover       text        not null check (cover in (
                    'cover-bricks', 'cover-tetro', 'cover-snake', 'cover-glot',
                    'cover-invaders', 'cover-rocas', 'cover-rana', 'cover-duelo')),
    color       text        not null check (color in ('cyan', 'magenta', 'yellow', 'green')),
    plays       text        not null,
    sort_order  smallint    not null,
    max_score   integer     not null default 10000000 check (max_score > 0),
    created_at  timestamptz not null default now()
);

comment on table public.games is
    'Game catalogue. Written by migration only: there is no write policy.';
comment on column public.games.plays is
    'Already formatted for display ("15.6K"). Seeded, not counted: a real play counter is another spec.';
comment on column public.games.sort_order is
    'Keeps the order the hardcoded array of SPEC 01 had.';
comment on column public.games.max_score is
    'Highest score this game accepts. A CHECK cannot query another table, so the per-game ceiling is enforced by the server action.';

-- One row per saved run. Nothing is overwritten and nothing is accumulated per
-- player: the leaderboard view resolves that.
create table public.scores (
    id          uuid primary key default gen_random_uuid(),
    game_id     text        not null references public.games (id) on delete cascade,
    player      text        not null check (player ~ '^[A-Z0-9_]{1,10}$'),
    score       integer     not null check (score >= 0 and score <= 10000000),
    created_at  timestamptz not null default now()
);

comment on table public.scores is
    'One row per saved run. Anonymous inserts are allowed; there is no update or delete policy, so a saved row is immutable from the API.';
comment on column public.scores.player is
    'Free text, uppercase, 1-10 chars. There is no identity until the auth spec.';

-- Serves both the leaderboard view and the MAX(score) of games_with_best.
create index scores_game_score_idx on public.scores (game_id, score desc, created_at);

alter table public.games enable row level security;
alter table public.scores enable row level security;

-- Everything is readable by anyone; only scores are writable, and only by insert.
create policy "games are public" on public.games
    for select to anon, authenticated using (true);

create policy "scores are public" on public.scores
    for select to anon, authenticated using (true);

create policy "anyone can submit a score" on public.scores
    for insert to anon, authenticated with check (true);
