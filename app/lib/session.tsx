"use client";

// Fake session, ported from the handlers in references/templates/app.jsx.
// There is no backend: the signed-in user lives in localStorage under "av_user"
// and saved scores under "av_scores".

import { useCallback, useMemo, useSyncExternalStore } from "react";

export type SessionUser = { name: string };

export type StoredScore = {
  game: string; // Game["id"]
  score: number;
  name: string;
  at: number; // Date.now()
};

const USER_KEY = "av_user";
const SCORES_KEY = "av_scores";

// The signed-in user is external state (localStorage), so it lives in a module
// store read through useSyncExternalStore instead of component state. The
// server snapshot is always null, which keeps the first client render identical
// to the server one; the stored user shows up right after hydration.
const listeners = new Set<() => void>();
let cachedUser: SessionUser | null = null;
let hydrated = false;

function readStoredUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser | null) : null;
  } catch {
    // Private mode or blocked storage: stay signed out.
    return null;
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

function getSnapshot(): SessionUser | null {
  // Read storage once, then serve the cached value so the snapshot stays
  // referentially stable between renders.
  if (!hydrated) {
    hydrated = true;
    cachedUser = readStoredUser();
  }
  return cachedUser;
}

function getServerSnapshot(): SessionUser | null {
  return null;
}

function setStoredUser(next: SessionUser | null) {
  hydrated = true;
  cachedUser = next;
  try {
    if (next) localStorage.setItem(USER_KEY, JSON.stringify(next));
    else localStorage.removeItem(USER_KEY);
  } catch {
    // Ignore: the session simply will not survive a reload.
  }
  emit();
}

type SessionValue = {
  user: SessionUser | null;
  signIn: (user: SessionUser | null) => void;
  signOut: () => void;
  saveScore: (entry: Omit<StoredScore, "at">) => void;
};

// Kept as a provider so the mounting point stays where the spec puts it, and so
// a real session backend can replace the store later without touching callers.
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return children;
}

export function useSession(): SessionValue {
  const user = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const signIn = useCallback((next: SessionUser | null) => setStoredUser(next), []);
  const signOut = useCallback(() => setStoredUser(null), []);

  const saveScore = useCallback((entry: Omit<StoredScore, "at">) => {
    try {
      const all = JSON.parse(localStorage.getItem(SCORES_KEY) || "[]") as StoredScore[];
      all.push({ ...entry, at: Date.now() });
      localStorage.setItem(SCORES_KEY, JSON.stringify(all));
    } catch {
      // Ignore: the score is lost but the run keeps working.
    }
  }, []);

  return useMemo(() => ({ user, signIn, signOut, saveScore }), [user, signIn, signOut, saveScore]);
}
