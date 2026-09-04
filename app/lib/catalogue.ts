// Reading the catalogue from Supabase (SPEC 06).
//
// Until this spec the eight cartridges were a literal array that shipped inside
// the bundle. They now live in public.games, seeded by migration, and the record
// each card announces is the real MAX(score) of public.scores that the
// games_with_best view computes.
//
// Server only: it holds the Supabase client and next/cache. What a client island
// needs — the Game type, CATS — lives in app/lib/games.ts, which has no imports.
//
// The reads go through unstable_cache: the catalogue only changes with a
// migration, so it is served from cache until a saved score moves a record and
// the submitScore action invalidates the "games" tag.

import { unstable_cache } from "next/cache";

import type { Category, CoverArt, Game } from "@/app/lib/games";
import { createPublicClient } from "@/app/lib/supabase/public";
import type { Tables } from "@/app/lib/supabase/types";

// The nine columns the interface needs. sort_order is ordered by but not read.
const COLUMNS = "id, title, short, long, cat, cover, color, plays, best";

type GameRow = Pick<
    Tables<"games_with_best">,
    | "id"
    | "title"
    | "short"
    | "long"
    | "cat"
    | "cover"
    | "color"
    | "plays"
    | "best"
>;

// The single place that converts a row into the type the components consume.
// Every column of a view comes back nullable and the three constrained ones come
// back as `string`: PostgREST cannot know that the view sits on NOT NULL columns,
// nor that CHECK constraints mirror the unions of app/lib/games.ts. Those
// constraints are what makes these casts safe, and keeping them here means no
// component has to know.
function toGame(row: GameRow): Game {
    return {
        id: row.id!,
        title: row.title!,
        short: row.short!,
        long: row.long!,
        cat: row.cat as Category,
        cover: row.cover as CoverArt,
        color: row.color as Game["color"],
        best: row.best ?? 0,
        plays: row.plays!,
    };
}

// A failed read is logged on the server and reported as "no catalogue". There is
// no hardcoded fallback on purpose: a silent fallback to invented rows makes a
// broken database indistinguishable from an empty one.
async function fetchGames(): Promise<Game[]> {
    const supabase = createPublicClient();
    const { data, error } = await supabase
        .from("games_with_best")
        .select(COLUMNS)
        .order("sort_order");

    if (error) {
        console.error("[games] Could not read the catalogue:", error.message);
        return [];
    }
    return data.map(toGame);
}

async function fetchGame(id: string): Promise<Game | undefined> {
    const supabase = createPublicClient();
    const { data, error } = await supabase
        .from("games_with_best")
        .select(COLUMNS)
        .eq("id", id)
        .maybeSingle();

    if (error) {
        console.error(`[games] Could not read "${id}":`, error.message);
        return undefined;
    }
    return data ? toGame(data) : undefined;
}

// unstable_cache — and not `use cache` — because next.config.ts does not enable
// cacheComponents. The arguments are part of the key, so getGame caches per id.
// The hour is a safety net for a migration that changes the catalogue without
// anything invalidating the tag; a new record invalidates it right away.
export const GAMES_TAG = "games";

const CACHE = { tags: [GAMES_TAG], revalidate: 3600 };

export const getGames = unstable_cache(fetchGames, ["games"], CACHE);
export const getGame = unstable_cache(fetchGame, ["game"], CACHE);
