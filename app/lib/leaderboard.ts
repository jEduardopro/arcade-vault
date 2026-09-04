// Reading the boards from Supabase (SPEC 06).
//
// Until this spec the rows came from seededScores(), a deterministic generator
// that filled the Hall of Fame and the eight cards with invented names. They now
// come from the public.leaderboard view, which keeps one row per (game, player)
// — their best mark — and ranks them per game.
//
// Server only: it holds the Supabase client. The ScoreRow type and the
// formatting live in app/lib/scores.ts, which has no imports.
//
// Nothing here is cached: a score has to show up the moment you come back from
// the run that produced it, so the two screens that read it are dynamic.

import { BOARD_SIZE, formatDate, type ScoreRow } from "@/app/lib/scores";
import { createPublicClient } from "@/app/lib/supabase/public";

const COLUMNS = "game_id, player, score, created_at, rank";

type LeaderboardRow = {
    game_id: string | null;
    player: string | null;
    score: number | null;
    created_at: string | null;
    rank: number | null;
};

function toScoreRow(row: LeaderboardRow): ScoreRow {
    return {
        rank: row.rank ?? 0,
        name: row.player ?? "",
        score: row.score ?? 0,
        date: formatDate(row.created_at),
    };
}

/** The `limit` best marks of one game, already ranked by the view. */
export async function getLeaderboard(
    gameId: string,
    limit = BOARD_SIZE,
): Promise<ScoreRow[]> {
    const supabase = createPublicClient();
    const { data, error } = await supabase
        .from("leaderboard")
        .select(COLUMNS)
        .eq("game_id", gameId)
        .lte("rank", limit)
        .order("rank");

    if (error) {
        console.error(`[scores] Could not read "${gameId}":`, error.message);
        return [];
    }
    return data.map(toScoreRow);
}

/**
 * The boards of several games in a single round trip, keyed by game id. The
 * Hall of Fame switches tabs with no second query and no loading state, which
 * is why it reads every board at once instead of one per tab.
 */
export async function getLeaderboards(
    gameIds: string[],
    limit = BOARD_SIZE,
): Promise<Record<string, ScoreRow[]>> {
    const boards: Record<string, ScoreRow[]> = Object.fromEntries(
        gameIds.map((id) => [id, []]),
    );
    if (gameIds.length === 0) return boards;

    const supabase = createPublicClient();
    const { data, error } = await supabase
        .from("leaderboard")
        .select(COLUMNS)
        .in("game_id", gameIds)
        .lte("rank", limit)
        .order("rank");

    if (error) {
        console.error("[scores] Could not read the boards:", error.message);
        return boards;
    }

    for (const row of data) {
        const board = row.game_id ? boards[row.game_id] : undefined;
        board?.push(toScoreRow(row));
    }
    return boards;
}
