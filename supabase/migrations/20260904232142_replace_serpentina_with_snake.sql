-- SPEC 09 — SNAKE takes the snake cartridge's slot in the catalogue.
--
-- The only game spec so far that inserts. SPEC 07 and SPEC 08 inherited a
-- seeded row and only moved its max_score; this game has to be called SNAKE and
-- the seeded row is called SERPENTINA, so the row is replaced rather than
-- renamed: the id is the URL slug and the name of the engine folder, and all
-- three should say the same thing.
--
-- `snake` takes over the same slot: same sort_order, cat, cover, color and the
-- same seeded plays. The catalogue still holds eight rows and cover-snake still
-- has exactly one owner.
--
-- Dropping serpentina carries nothing with it: it has no rows in public.scores,
-- and no component names it — the row was only ever data. /games/serpentina
-- starts returning 404, and nothing linked there: the cartridge was never
-- playable and its card is only reachable from /games.
--
-- Idempotent both ways, so re-applying is a no-op: deleting a row that is
-- already gone does nothing, and the insert carries the `on conflict do
-- nothing` SPEC 06 requires of every seed with a literal id.

delete from public.games where id = 'serpentina';

insert into public.games (id, title, short, long, cat, cover, color, plays, sort_order, max_score) values
(
    'snake',
    'SNAKE',
    'Crece a base de fruta sin morderte la cola.',
    'Una serpiente de luz recorre la grilla buscando fruta. Cada bocado la alarga y, cada cinco, la grilla acelera y la fruta pasa a valer más. Los cuatro muros matan, y un movimiento en falso la hace devorarse a sí misma.',
    'ARCADE', 'cover-snake', 'green', '9.1K', 2, 50000
)
on conflict (id) do nothing;
