// Per-IP send quota for the contact form (SPEC 03).
//
// Deliberately ephemeral: the counter is a module-level Map, so it dies with the
// process and is not shared between instances. That is enough to stop trivial
// abuse of a public form, which is all this project needs; a shared store
// (Redis, KV) is out of scope and would be the first thing to add if the form
// ever mattered more than the mock behind it.

export const CONTACT_RATE = {
    max: 3, // sends allowed
    windowMs: 10 * 60 * 1000, // per 10-minute window
} as const;

// IP → timestamps of its sends inside the current window.
const hits = new Map<string, number[]>();

// Returns false once the IP has used up its quota. Called only after the input
// validates, so a malformed form never burns a slot.
export function takeContactSlot(ip: string): boolean {
    const now = Date.now();
    const since = now - CONTACT_RATE.windowMs;
    const recent = (hits.get(ip) ?? []).filter((at) => at > since);

    if (recent.length >= CONTACT_RATE.max) {
        // Store the pruned list anyway: the entry stays accurate while the caller
        // keeps knocking, and it shrinks as the window slides.
        hits.set(ip, recent);
        return false;
    }

    recent.push(now);
    hits.set(ip, recent);

    // Drop entries that have gone quiet, so the Map cannot grow without bound.
    for (const [key, times] of hits) {
        if (times.every((at) => at <= since)) hits.delete(key);
    }

    return true;
}
