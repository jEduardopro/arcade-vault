"use client";

// The player's skin preference, stored in localStorage under "av_skin".
//
// Same shape as app/lib/session.tsx and for the same reasons: the preference is
// external browser state, so it lives in a module store read through
// useSyncExternalStore instead of component state, and the server snapshot is
// always DEFAULT_SKIN so the first client render matches the server's. The
// stored skin arrives right after hydration.
//
// This module is the preference and nothing else. It knows no engine and no
// palette: what a skin id paints is decided in app/lib/engines/<game>/skins.ts.

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_SKIN, isSkinId, type SkinId } from "@/app/lib/skins";

const SKIN_KEY = "av_skin";

const listeners = new Set<() => void>();
let cachedSkin: SkinId = DEFAULT_SKIN;
let hydrated = false;

function readStoredSkin(): SkinId {
    try {
        const raw = localStorage.getItem(SKIN_KEY);
        // A stale or hand-edited value is treated as absent: a skin id that no
        // longer exists must never be able to break the screen.
        return isSkinId(raw) ? raw : DEFAULT_SKIN;
    } catch {
        // Private mode or blocked storage: the default is always paintable.
        return DEFAULT_SKIN;
    }
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

function emit() {
    for (const listener of listeners) listener();
}

function getSnapshot(): SkinId {
    // Read storage once, then serve the cached value so the snapshot stays
    // referentially stable between renders.
    if (!hydrated) {
        hydrated = true;
        cachedSkin = readStoredSkin();
    }
    return cachedSkin;
}

/**
 * Always DEFAULT_SKIN. Returning the stored value here would make the first
 * client render disagree with the server's and React would report a hydration
 * mismatch — the same reason app/lib/session.tsx serves `null`.
 */
function getServerSnapshot(): SkinId {
    return DEFAULT_SKIN;
}

function setStoredSkin(next: SkinId) {
    hydrated = true;
    cachedSkin = next;
    try {
        localStorage.setItem(SKIN_KEY, next);
    } catch {
        // Ignore: the choice simply will not survive a reload.
    }
    emit();
}

/** The current skin and a setter, like useSession()'s user and signIn. */
export function useSkin(): [SkinId, (next: SkinId) => void] {
    const skin = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot,
    );
    const setSkin = useCallback((next: SkinId) => setStoredSkin(next), []);
    return [skin, setSkin];
}
