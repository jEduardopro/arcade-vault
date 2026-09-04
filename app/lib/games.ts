// The shape of a cartridge (SPEC 06).
//
// Deliberately dependency-free — no Supabase client, no next/* imports — so a
// client island can import the types and CATS without dragging the query layer
// into the browser bundle. It is the same boundary SPEC 03 drew with
// app/lib/contact.ts.
//
// The rows themselves are read in app/lib/catalogue.ts.

export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export type CoverArt =
    | "cover-bricks"
    | "cover-tetro"
    | "cover-snake"
    | "cover-glot"
    | "cover-invaders"
    | "cover-rocas"
    | "cover-rana"
    | "cover-duelo";

export type Game = {
    id: string; // URL slug: "bloque-buster", "caida", …
    title: string; // "BLOQUE BUSTER"
    short: string; // card copy
    long: string; // detail page copy
    cat: Category;
    cover: CoverArt; // CSS class of the cover generator in globals.css
    color: "cyan" | "magenta" | "yellow" | "green"; // JUGAR button variant
    best: number; // MAX(score) of the game, 0 when nobody has played it
    plays: string; // already formatted: "12.4K"
};

export const CATS = [
    "TODOS",
    "ARCADE",
    "PUZZLE",
    "SHOOTER",
    "VERSUS",
] as const satisfies readonly ["TODOS", ...Category[]];
