// Cookie-less Supabase client for public reads (SPEC 06).
//
// The third client of the project, and the only one that can run inside
// `unstable_cache`: that helper forbids the request APIs, and the client of
// server.ts calls `cookies()`. It is also the honest one for this job — the
// catalogue and the leaderboard are public data that do not depend on who asks
// for them, so binding the query to a session would be noise.
//
// Reads only. The insert of a score goes through the server client, which is
// bound to its request and is where a real session will appear when the auth
// spec lands.

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/app/lib/supabase/types";

// SPEC 04 left this decision to the first spec that actually queries Supabase.
// Failing loudly here, with the name of the variable, beats a PostgREST error
// about an undefined URL three stack frames down; the callers catch it, log it
// and render an empty screen.
function required(name: string, value: string | undefined): string {
    if (!value) throw new Error(`Missing environment variable: ${name}`);
    return value;
}

export function createPublicClient() {
    return createSupabaseClient<Database>(
        required(
            "NEXT_PUBLIC_SUPABASE_URL",
            process.env.NEXT_PUBLIC_SUPABASE_URL,
        ),
        required(
            "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        ),
        {
            // There is no user here and nothing to persist: this client is
            // created per query and thrown away.
            auth: { persistSession: false, autoRefreshToken: false },
        },
    );
}
