"use client";

// The player screen's dispatcher, and nothing else. A cartridge with an entry
// in the registry mounts its real game; every other one falls back to the fake
// player SPEC 01 shipped.

import { FakeGamePlayer } from "@/app/components/fake-game-player";
import { GAME_ENGINES } from "@/app/components/game-registry";
import type { Game } from "@/app/lib/games";

export function GamePlayer({ game }: { game: Game }) {
    const Engine = GAME_ENGINES[game.id];
    return Engine ? <Engine game={game} /> : <FakeGamePlayer game={game} />;
}
