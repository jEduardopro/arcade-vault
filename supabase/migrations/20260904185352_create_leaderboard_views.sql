-- SPEC 06 — The catalogue and the scores, step 2: the two read views.
--
-- Both are declared `security_invoker = true`. Without it a view runs with the
-- privileges of whoever created it and bypasses the RLS of the tables it reads,
-- which is exactly what the security advisor flags.

-- The best mark of each player, already ranked. A player can save ten runs of
-- ASTEROIDES; the Hall of Fame shows one, the best. Ties are broken by
-- created_at asc: whoever reached the number first stays ahead.
create view public.leaderboard with (security_invoker = true) as
with best as (
    select distinct on (game_id, player)
        game_id,
        player,
        score,
        created_at
    from public.scores
    order by game_id, player, score desc, created_at asc
)
select
    game_id,
    player,
    score,
    created_at,
    (row_number() over (partition by game_id order by score desc, created_at asc))::int as rank
from best;

comment on view public.leaderboard is
    'One row per (game_id, player) with their highest score, ranked per game. Clients filter by game_id and rank.';

-- The catalogue with its real record. A game with no saved run reports 0, which
-- is the truth: today only ASTEROIDES is playable.
create view public.games_with_best with (security_invoker = true) as
select
    g.*,
    coalesce(max(s.score), 0)::int as best
from public.games g
left join public.scores s on s.game_id = g.id
group by g.id;

comment on view public.games_with_best is
    'The games table plus MAX(score) as `best`. Replaces the invented record of the hardcoded catalogue.';
