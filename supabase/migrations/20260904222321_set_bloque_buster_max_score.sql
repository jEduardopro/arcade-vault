-- SPEC 08 — The scoring ceiling of BLOQUE BUSTER.
--
-- max_score is what app/actions/scores.ts reads live before inserting a row,
-- so it is the only real guard on the table: RLS lets anyone insert and there
-- is no identity until the auth spec. The seeded default of 10 000 000 lets
-- through anything.
--
-- The number comes from counting blocks. The five patterns of
-- references/started-games/04-arkanoid/levels.js hold 60, 40, 30, 39 and 39
-- blocks, so a full lap is 208 of them at 10 points each: 2 080 points. SPEC 08
-- turns the five-level game into an endless loop, so there is no natural
-- ceiling any more, and 100 000 is 48 full laps — out of reach with three lives
-- and the speed capped at x2, and still small enough to reject a seven-figure
-- invention.
--
-- Data only: no schema change, so app/lib/supabase/types.ts is untouched.
-- Idempotent by nature, so it needs no `on conflict` guard.

update public.games set max_score = 100000 where id = 'bloque-buster';
