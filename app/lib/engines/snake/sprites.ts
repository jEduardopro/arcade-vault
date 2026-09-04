// The fruit sheet, and the only place in the engine that knows an image exists.
//
// It has the same job sound.ts has in BLOQUE BUSTER: it isolates the asset, so
// engine.ts asks for "slot 3, centred here" and never learns whether that came
// out of a PNG or out of two canvas primitives.
//
// SPEC 07 and SPEC 08 left the rule that no engine needs a loading gate before
// its first frame. This one has a gate, because here the fruit *is* the game —
// and it has a gate with a net: onReady fires on `error` too, so a 404 costs
// the sprite and never the game.

import { PALETTE, SHEET } from "./constants";
import { foodBox } from "./entities";

export type FruitSheet = {
    /** true once the sheet loaded. When false, draw() paints the vector fruit. */
    readonly ready: boolean;
    /** Paints fruit `slot` centred on (cx, cy), in world coordinates. */
    draw(
        ctx: CanvasRenderingContext2D,
        slot: number,
        cx: number,
        cy: number,
    ): void;
    destroy(): void;
};

/**
 * Starts loading the sheet and hands back the painter.
 *
 * `onReady` is called exactly once, on `load` and on `error` alike, which is
 * what the engine waits for before its first frame. It never fires after
 * destroy(): a cartridge unmounted mid-download must not wake an engine that
 * is already gone.
 */
export function createFruitSheet(onReady: () => void): FruitSheet {
    const image = new Image();
    let loaded = false;
    let settled = false;
    let destroyed = false;

    const settle = (ok: boolean) => {
        if (settled || destroyed) return;
        settled = true;
        loaded = ok;
        onReady();
    };

    const handleLoad = () => settle(true);
    const handleError = () => settle(false);

    image.addEventListener("load", handleLoad);
    image.addEventListener("error", handleError);
    image.src = SHEET.src;

    // A cached image can already be complete here, and a decoded one fires no
    // further `load`: without this the gate would never open.
    if (image.complete && image.naturalWidth > 0) settle(true);

    return {
        get ready() {
            return loaded;
        },

        draw(ctx, slot, cx, cy) {
            if (!loaded) {
                drawVectorFruit(ctx, cx, cy);
                return;
            }

            const box = foodBox(cx, cy);
            const index = Math.max(0, Math.min(SHEET.count - 1, slot));
            ctx.drawImage(
                image,
                index * SHEET.slot.w,
                0,
                SHEET.slot.w,
                SHEET.slot.h,
                box.x,
                box.y,
                box.w,
                box.h,
            );
        },

        destroy() {
            destroyed = true;
            image.removeEventListener("load", handleLoad);
            image.removeEventListener("error", handleError);
            // Cancels a download still in flight.
            image.src = "";
        },
    };
}

/**
 * The fallback: the magenta core the cover-snake art draws, which is also what
 * the catalogue copy promised before this cartridge had sprites. The game
 * plays exactly the same; only the pixels change.
 */
function drawVectorFruit(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
): void {
    ctx.save();
    ctx.shadowColor = PALETTE.halo;
    ctx.shadowBlur = 14;
    ctx.fillStyle = PALETTE.halo;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
