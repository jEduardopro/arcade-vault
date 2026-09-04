// The two sound effects of references/started-games/04-arkanoid/game.js, the
// only cartridge of the Vault that makes any noise.
//
// It stays inside the engine's half of the boundary: nothing here touches the
// page, the HUD or React, and the engine owns the whole lifetime through
// destroy(). What it does need is the browser's audio, so this is the one file
// of app/lib/engines/ that reaches past the canvas and the window.
//
// The original does `new Audio(src).cloneNode().play()` on every single hit,
// which allocates an element per bounce. Here each effect keeps a small fixed
// pool of voices and rotates through them, so two hits in the same frame still
// overlap without churning the GC.

import { SOUNDS } from "@/app/lib/engines/bloque-buster/constants";

class Sample {
    private readonly voices: HTMLAudioElement[];
    private next = 0;

    constructor(src: string) {
        this.voices = Array.from({ length: SOUNDS.voices }, () => {
            const audio = new Audio(src);
            audio.preload = "auto";
            audio.volume = SOUNDS.volume;
            return audio;
        });
    }

    play() {
        const voice = this.voices[this.next];
        this.next = (this.next + 1) % this.voices.length;
        voice.currentTime = 0;
        // Autoplay policy can still refuse a sound that arrives before the
        // player's first gesture. A refused effect is not an error worth
        // surfacing, and an unhandled rejection would show up in the console.
        void voice.play().catch(() => {});
    }

    stop() {
        for (const voice of this.voices) voice.pause();
    }
}

export type Sounds = {
    /** Off a wall or off the paddle. */
    bounce(): void;
    /** A block just went. */
    smash(): void;
    /** Silences every voice. Called from the engine's destroy(). */
    destroy(): void;
};

export function createSounds(): Sounds {
    const bounce = new Sample(SOUNDS.bounce);
    const smash = new Sample(SOUNDS.smash);

    return {
        bounce: () => bounce.play(),
        smash: () => smash.play(),
        destroy() {
            bounce.stop();
            smash.stop();
        },
    };
}
