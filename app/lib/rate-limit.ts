// Per-IP quotas for the two public write paths: the contact form (SPEC 03) and
// saving a score (SPEC 06).
//
// Deliberately ephemeral: each counter is a module-level Map, so it dies with the
// process and is not shared between instances. That is enough to stop trivial
// abuse of a public form, which is all this project needs; a shared store
// (Redis, KV) is out of scope and would be the first thing to add if either
// path ever mattered more than the mock behind it.

type Rate = { max: number; windowMs: number };

export const CONTACT_RATE = {
    max: 3, // sends allowed
    windowMs: 10 * 60 * 1000, // per 10-minute window
} as const satisfies Rate;

// Looser than the contact form because a run has to be played before it can be
// saved, and tighter than the table's CHECK constraints, which is the last line.
export const SCORE_RATE = {
    max: 5, // scores allowed
    windowMs: 5 * 60 * 1000, // per 5-minute window
} as const satisfies Rate;

// IP → timestamps of its writes inside the current window. One store per quota,
// so burning the contact allowance never blocks saving a score.
const contactHits = new Map<string, number[]>();
const scoreHits = new Map<string, number[]>();

// Returns false once the IP has used up its quota. Called only after the input
// validates, so a malformed request never burns a slot.
function takeSlot(
    hits: Map<string, number[]>,
    ip: string,
    rate: Rate,
): boolean {
    const now = Date.now();
    const since = now - rate.windowMs;
    const recent = (hits.get(ip) ?? []).filter((at) => at > since);

    if (recent.length >= rate.max) {
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

export function takeContactSlot(ip: string): boolean {
    return takeSlot(contactHits, ip, CONTACT_RATE);
}

export function takeScoreSlot(ip: string): boolean {
    return takeSlot(scoreHits, ip, SCORE_RATE);
}
