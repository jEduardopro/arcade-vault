// Mock leaderboard rows, ported from references/templates/data.jsx.
// Deterministic on purpose: the same seed always yields the same rows, so the
// server and the client render identical markup.

export type ScoreRow = {
    rank: number;
    name: string;
    score: number;
    date: string; // "07/03/2026"
};

const PLAYERS = [
    "PX_KAI",
    "NEONFOX",
    "Z3R0COOL",
    "M00NRYU",
    "VAULT_07",
    "GLITCHA",
    "ATARI_KID",
    "CYBER_LU",
    "MAGENTA88",
    "SCANLINE",
    "BIT_LORD",
    "ARKADYA",
    "DROID_X",
    "RGB_QUEEN",
    "PIXEL_DAD",
    "RETROVIRA",
    "VECTORX",
    "JOY_STK",
];

export function seededScores(seed: number, count = 12): ScoreRow[] {
    let s = seed;
    const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const used = new Set<string>();
    const rows: ScoreRow[] = [];
    for (let i = 0; i < count; i++) {
        let name: string;
        do {
            name = PLAYERS[Math.floor(rand() * PLAYERS.length)];
        } while (used.has(name) && used.size < PLAYERS.length);
        used.add(name);
        const base = Math.floor(50000 + rand() * 250000);
        const score = base - i * Math.floor(2000 + rand() * 4000);
        const day = String(1 + Math.floor(rand() * 28)).padStart(2, "0");
        const mon = String(1 + Math.floor(rand() * 12)).padStart(2, "0");
        rows.push({
            rank: i + 1,
            name,
            score: Math.max(score, 1000),
            date: `${day}/${mon}/2026`,
        });
    }
    return rows
        .sort((a, b) => b.score - a.score)
        .map((r, i) => ({ ...r, rank: i + 1 }));
}

// Replaces toLocaleString("es-ES"): a fixed "." thousands separator, so the
// output never depends on the ICU data available to Node or to the browser.
// Spanish uses minimumGroupingDigits: 2, so four-digit numbers are NOT grouped
// ("7820", not "7.820") and grouping only starts at five digits ("18.900").
export function formatScore(n: number): string {
    const negative = n < 0;
    const digits = Math.trunc(Math.abs(n)).toString();
    const grouped =
        digits.length > 4
            ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
            : digits;
    return negative ? `-${grouped}` : grouped;
}
