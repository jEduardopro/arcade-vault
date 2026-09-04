"use server";

// Saving a score (SPEC 06). A server action rather than an insert from the
// browser: the name and the ceiling are checked on the server, the IP quota is
// applied where the client cannot see it, and the screens that show the mark are
// revalidated in the same call.
//
// The insert itself is allowed by RLS for anonymous visitors — there is no
// identity in this project until the auth spec — so what protects the table is
// this action plus the CHECK constraints behind it.
//
// Every message handed back to the client is a fixed literal. The detail of a
// Postgres failure goes to the server log and nowhere else.

import { revalidatePath, revalidateTag } from "next/cache";
import { headers } from "next/headers";

import { GAMES_TAG } from "@/app/lib/catalogue";
import { takeScoreSlot } from "@/app/lib/rate-limit";
import { type ScoreState, validateScore } from "@/app/lib/scores";
import { createClient } from "@/app/lib/supabase/server";

const RATE_LIMITED =
    "Demasiadas puntuaciones desde esta conexión. Inténtalo en unos minutos.";
const UNKNOWN_GAME = "Ese cartucho no existe.";
const SAVE_FAILED = "No pudimos guardar la puntuación. Inténtalo de nuevo.";

// x-forwarded-for carries a comma-separated chain; the client is the first hop.
// Missing behind a proxy that does not set it, everything shares the "unknown"
// bucket — the quota gets stricter, never laxer, which is the right way to fail.
async function clientIp(): Promise<string> {
    const forwarded = (await headers()).get("x-forwarded-for");
    return forwarded?.split(",")[0]?.trim() || "unknown";
}

export async function submitScore(
    _prev: ScoreState,
    formData: FormData,
): Promise<ScoreState> {
    const gameId = String(formData.get("gameId") ?? "");
    const player = String(formData.get("player") ?? "");
    const score = Number(formData.get("score"));

    const supabase = await createClient();

    // The ceiling is a column of the game, because a CHECK constraint cannot
    // look at another table. Read live and not through the cached catalogue:
    // this is the value a validation leans on, and it doubles as the existence
    // check for the id the form sent.
    const { data: game, error: gameError } = await supabase
        .from("games")
        .select("max_score")
        .eq("id", gameId)
        .maybeSingle();

    if (gameError) {
        console.error(
            `[scores] Could not read "${gameId}": ${gameError.code} — ${gameError.message}`,
        );
        return { status: "failed", message: SAVE_FAILED };
    }
    if (!game) {
        return { status: "failed", message: UNKNOWN_GAME };
    }

    const validation = validateScore({
        player,
        score,
        maxScore: game.max_score,
    });
    if (!validation.ok) {
        return { status: "failed", message: validation.message };
    }

    // Checked after validation so a malformed submission never burns a slot.
    if (!takeScoreSlot(await clientIp())) {
        return { status: "failed", message: RATE_LIMITED };
    }

    try {
        const { error } = await supabase.from("scores").insert({
            game_id: gameId,
            player: validation.value.player,
            score: validation.value.score,
        });

        if (error) {
            console.error(
                `[scores] Rejected insert for "${gameId}": ${error.code} — ${error.message}`,
            );
            return { status: "failed", message: SAVE_FAILED };
        }
    } catch (cause) {
        console.error("[scores] Could not reach Supabase:", cause);
        return { status: "failed", message: SAVE_FAILED };
    }

    // The two screens that read boards are dynamic, but their prerendered shell
    // is not, and the record on every card lives in the cached catalogue.
    //
    // `{ expire: 0 }` makes the next request a blocking miss instead of serving
    // the stale record: whoever just beat it must see their own number. The
    // read-your-own-writes helper for this, updateTag, only reaches tags set by
    // `use cache`, and these come from unstable_cache — next.config.ts does not
    // enable cacheComponents. Passing no second argument does the same thing but
    // is deprecated in Next 16.
    revalidateTag(GAMES_TAG, { expire: 0 });
    revalidatePath("/hall-of-fame");
    revalidatePath("/games/[id]", "page");

    return { status: "saved" };
}
