-- SPEC 06 — The catalogue and the scores, step 3b: twelve marks to beat.
--
-- Only ASTEROIDES is seeded. It is the one cartridge that really plays since
-- SPEC 05, so it is the only one where a seeded mark means anything; the other
-- seven boards start empty, which is the truth.
--
-- The names are the retro handles the deleted seededScores() used, and the top
-- mark is the 41200 the hardcoded card announced as its record, so the figure
-- the catalogue showed before this spec survives as a real row.
--
-- The ids are literal instead of gen_random_uuid() for one reason: with a random
-- primary key `on conflict do nothing` can never fire, and re-applying the seed
-- would duplicate all twelve rows.

insert into public.scores (id, game_id, player, score, created_at) values
('a5100000-0000-4000-8000-000000000001', 'asteroides', 'PX_KAI',    41200, '2026-02-11 21:14:00+00'),
('a5100000-0000-4000-8000-000000000002', 'asteroides', 'NEONFOX',   38650, '2026-03-02 18:40:00+00'),
('a5100000-0000-4000-8000-000000000003', 'asteroides', 'Z3R0COOL',  35400, '2026-01-27 23:05:00+00'),
('a5100000-0000-4000-8000-000000000004', 'asteroides', 'M00NRYU',   31980, '2026-04-19 20:22:00+00'),
('a5100000-0000-4000-8000-000000000005', 'asteroides', 'VAULT_07',  29750, '2026-02-28 17:36:00+00'),
('a5100000-0000-4000-8000-000000000006', 'asteroides', 'GLITCHA',   26400, '2026-05-08 22:51:00+00'),
('a5100000-0000-4000-8000-000000000007', 'asteroides', 'ATARI_KID', 23100, '2026-03-24 19:07:00+00'),
('a5100000-0000-4000-8000-000000000008', 'asteroides', 'CYBER_LU',  19850, '2026-06-01 21:45:00+00'),
('a5100000-0000-4000-8000-000000000009', 'asteroides', 'MAGENTA88', 16700, '2026-04-06 16:19:00+00'),
('a5100000-0000-4000-8000-00000000000a', 'asteroides', 'SCANLINE',  13250, '2026-07-13 23:58:00+00'),
('a5100000-0000-4000-8000-00000000000b', 'asteroides', 'BIT_LORD',   9800, '2026-05-30 18:12:00+00'),
('a5100000-0000-4000-8000-00000000000c', 'asteroides', 'ARKADYA',    6450, '2026-08-17 20:33:00+00')
on conflict (id) do nothing;
