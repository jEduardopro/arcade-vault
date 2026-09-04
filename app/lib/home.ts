// Mock content of the landing, ported from references/templates/home-about/home.jsx.
// Every literal is copied word for word so the page matches the reference; the
// only derived value is the game count, which reads the real catalogue instead
// of the reference's hardcoded "12+".

import { GAMES } from "@/app/lib/games";

export type AccentColor = "cyan" | "magenta" | "yellow" | "green";
export type FeatureIconKind = "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";

export type HomeFeature = {
    icon: FeatureIconKind;
    title: string; // "JUEGOS CLÁSICOS"
    desc: string;
    color: AccentColor;
};

export type TickerRow = {
    player: string; // "NEONFOX"
    game: string; // "Caída"
    score: number; // 184220
    ago: string; // "hace 2 min"
    color: AccentColor;
};

export type TopRow = {
    rank: number; // 1..5
    player: string;
    score: number;
};

export type HomeStat = {
    n: string; // "8+", "MILES", "GLOBAL"
    unit: string; // "JUEGOS"
    sub: string; // "Y CONTANDO"
};

export type FaqItem = { q: string; a: string };

export const HOME_FEATURES: readonly HomeFeature[] = [
    {
        icon: "GAMEPAD",
        title: "JUEGOS CLÁSICOS",
        desc: "Arkanoid, Tetris, Snake y muchos más. Los mejores arcades de todos los tiempos en un solo lugar.",
        color: "cyan",
    },
    {
        icon: "FREE",
        title: "100% GRATIS",
        desc: "Sin suscripciones, sin pagos ocultos. Todos los juegos disponibles de forma gratuita.",
        color: "yellow",
    },
    {
        icon: "TROPHY",
        title: "LADDER BOARDS",
        desc: "Compite con jugadores de todo el mundo. Escala el ranking y demuestra quién es el mejor.",
        color: "magenta",
    },
    {
        icon: "ROCKET",
        title: "SIEMPRE CRECIENDO",
        desc: "Agregamos nuevos juegos constantemente. Vuelve seguido, siempre habrá algo nuevo que jugar.",
        color: "green",
    },
];

export const HOME_TICKER: readonly TickerRow[] = [
    {
        player: "NEONFOX",
        game: "Caída",
        score: 184220,
        ago: "hace 2 min",
        color: "magenta",
    },
    {
        player: "PX_KAI",
        game: "Glotón",
        score: 96400,
        ago: "hace 5 min",
        color: "yellow",
    },
    {
        player: "Z3R0COOL",
        game: "Invasores",
        score: 54190,
        ago: "hace 8 min",
        color: "green",
    },
    {
        player: "VAULT_07",
        game: "Rocas",
        score: 41200,
        ago: "hace 12 min",
        color: "cyan",
    },
    {
        player: "GLITCHA",
        game: "Bloque Buster",
        score: 28450,
        ago: "hace 18 min",
        color: "cyan",
    },
    {
        player: "ARKADYA",
        game: "Serpentina",
        score: 7820,
        ago: "hace 24 min",
        color: "green",
    },
    {
        player: "CYBER_LU",
        game: "Ranaria",
        score: 18900,
        ago: "hace 31 min",
        color: "yellow",
    },
];

export const HOME_TOP: readonly TopRow[] = [
    { rank: 1, player: "NEONFOX", score: 312840 },
    { rank: 2, player: "PX_KAI", score: 248110 },
    { rank: 3, player: "M00NRYU", score: 196720 },
    { rank: 4, player: "VAULT_07", score: 154300 },
    { rank: 5, player: "GLITCHA", score: 138900 },
];

// The reference announced a flat "12+"; the catalogue is the source of truth so
// the landing cannot promise games the library does not have.
export const HOME_STATS: readonly HomeStat[] = [
    { n: `${GAMES.length}+`, unit: "JUEGOS", sub: "Y CONTANDO" },
    { n: "MILES", unit: "DE PARTIDAS", sub: "JUGADAS CADA DÍA" },
    { n: "GLOBAL", unit: "RANKING", sub: "COMPITE CON EL MUNDO" },
];

export const HOME_FAQ: readonly FaqItem[] = [
    {
        q: "¿REALMENTE ES GRATIS?",
        a: 'Sí. Arcade Vault es un proyecto sin fines de lucro hecho por amor a los clásicos. No hay versión "premium" escondida.',
    },
    {
        q: "¿NECESITO CREAR CUENTA?",
        a: "No. Puedes jugar como invitado. Si quieres guardar tu puntuación y aparecer en el ranking, regístrate en 10 segundos.",
    },
    {
        q: "¿CÓMO SOBREVIVEN SIN COBRAR?",
        a: "Es un proyecto comunitario. Si te gusta, compártelo. Esa es toda la moneda que aceptamos.",
    },
];

// The leading "✔" is part of the string on purpose: `.pc-list li::first-letter`
// in globals.css paints the first character green.
export const PLAN_PERKS: readonly string[] = [
    "✔ Acceso a todos los juegos",
    "✔ Ranking global y salón de la fama",
    "✔ Sin anuncios entre partidas",
    "✔ Guarda tus puntuaciones",
    "✔ Nuevos juegos cada mes",
    "✔ Funciona en cualquier navegador",
];

// How many games the landing rail previews before sending the visitor to /games.
export const PREVIEW_COUNT = 6;
