// The three skins every playable cartridge offers, and nothing else.
//
// This module is dependency-free on purpose: it lives in app/lib/ and not
// beside the engines because a Client Component (the skin selector) will
// import it, and app/lib/engines/ stays framework-free. It is the same
// pure-module rule app/lib/games.ts follows since SPEC 06.
//
// The ids are lowercase and unaccented because they are code, not labels:
// they end up in a stored preference and in a data attribute. The accented
// on-screen text lives in SKIN_LABELS.

/** The closed set of skin ids. There is no fourth. */
export type SkinId = "clasico" | "neon" | "retro";

/** Every id, in the order the selector shows them. */
export const SKIN_IDS: readonly SkinId[] = ["clasico", "neon", "retro"];

/**
 * The skin a cartridge boots with. `clasico` is a byte-for-byte copy of each
 * engine's PALETTE, so the default changes nothing on screen.
 *
 * It is also what the server snapshot of the preference store has to return,
 * or the first client render disagrees with the server's and React reports a
 * hydration mismatch — the same reason app/lib/session.tsx serves `null`.
 */
export const DEFAULT_SKIN: SkinId = "clasico";

/** On-screen names, Spanish like the rest of the interface. */
export const SKIN_LABELS: Record<SkinId, string> = {
    clasico: "CLÁSICO",
    neon: "NEÓN",
    retro: "RETRO",
};

/** True when an unknown string — a stale stored value — is a real skin id. */
export function isSkinId(value: unknown): value is SkinId {
    return (
        typeof value === "string" &&
        (SKIN_IDS as readonly string[]).includes(value)
    );
}
