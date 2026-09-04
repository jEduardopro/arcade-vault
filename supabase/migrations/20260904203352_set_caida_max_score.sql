-- SPEC 07 — The scoring ceiling of CAÍDA.
--
-- max_score is what app/actions/scores.ts reads live before inserting a row,
-- so it is the only real guard on the table: RLS lets anyone insert and there
-- is no identity until the auth spec. The seeded default of 10 000 000 lets
-- through anything.
--
-- With the scoring of references/started-games/03-tetris/game.js — line
-- clears at 100/300/500/800 times the level, +2 per hard-dropped cell, +1 per
-- soft-dropped row — an honest run does not come near a million.
--
-- Data only: no schema change, so app/lib/supabase/types.ts is untouched.
-- Idempotent by nature, so it needs no `on conflict` guard.

update public.games set max_score = 1000000 where id = 'caida';
