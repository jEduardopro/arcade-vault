// Browser Supabase client (SPEC 04).
//
// For Client Components. It is a function, not an exported singleton: each
// caller creates its own instance inside the component that needs it.
//
// No "use client" here — this module is not a component. The components that
// import it are the ones carrying the directive.
//
// Nothing calls this yet: SPEC 04 only wires the integration up. The first spec
// that actually queries Supabase decides what to do when the two environment
// variables are missing, the same way SPEC 03 decided the console fallback for
// Resend.

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/app/lib/supabase/types";

export function createClient() {
    return createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
}
