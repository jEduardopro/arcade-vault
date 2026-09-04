"use client";

// The single place where a ported game is plugged into the player screen.
// Every port so far has cost exactly one dynamic() and one map entry here;
// nothing else on /games/[id]/play needs to change.
//
// It lives under app/components/ and not next to the engines because what it
// holds is React components. app/lib/engines/ stays free of React so an engine
// can be reasoned about — and one day tested — without a renderer.

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { Game } from "@/app/lib/games";

export type GameComponentProps = { game: Game };

// Loaded on demand, so the five cartridges that are still a CSS animation never
// download an engine, and opening one game does not pull in the others'.
// ssr: false because a canvas game has nothing to render on the server: it
// needs the DOM from its first frame.
const AsteroidesGame = dynamic(
    () => import("@/app/components/asteroides-game"),
    { ssr: false },
);

const CaidaGame = dynamic(() => import("@/app/components/caida-game"), {
    ssr: false,
});

const BloqueBusterGame = dynamic(
    () => import("@/app/components/bloque-buster-game"),
    { ssr: false },
);

/** Maps Game["id"] to its playable component. Missing id → fake player. */
export const GAME_ENGINES: Partial<
    Record<string, ComponentType<GameComponentProps>>
> = {
    asteroides: AsteroidesGame,
    caida: CaidaGame,
    "bloque-buster": BloqueBusterGame,
};
