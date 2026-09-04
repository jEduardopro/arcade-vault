// Server Supabase client (SPEC 04).
//
// For Server Components, Server Actions and Route Handlers. It is async because
// `cookies()` is async in Next 16, and it is created per request: the session
// lives in that request's cookies, so reusing one instance across requests would
// mix users up.
//
// Nothing calls this yet — see the note in ./client.ts.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/app/lib/supabase/types";

export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        for (const { name, value, options } of cookiesToSet) {
                            cookieStore.set(name, value, options);
                        }
                    } catch {
                        // Called from a Server Component, where cookies are
                        // read-only. Safe to ignore: refreshing the session is
                        // the job of the proxy.ts that arrives with the auth
                        // spec (in Next 16 it is proxy.ts, not middleware.ts).
                    }
                },
            },
        },
    );
}
