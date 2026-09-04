// The shape of a leaderboard row, its formatting and its validation (SPEC 06).
//
// Deliberately dependency-free — no Supabase client, no next/* imports — so the
// client islands that render a score and the modal that saves one can import
// this without dragging the query layer into the browser bundle. Same boundary
// SPEC 03 drew with app/lib/contact.ts.
//
// The rows themselves are read in app/lib/leaderboard.ts, and the insert lives
// in app/actions/scores.ts.

export type ScoreRow = {
    rank: number;
    name: string;
    score: number;
    date: string; // "07/03/2026"
};

// How many marks a board shows. The Hall of Fame table and the panel of the
// detail screen kept these two numbers from the reference templates.
export const BOARD_SIZE = 12;
export const DETAIL_BOARD_SIZE = 10;

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

// Hand-written for the same reason as formatScore: toLocaleDateString depends on
// the ICU build. The UTC parts are read, not the local ones, so the day cannot
// shift with the time zone of whatever machine renders the row.
export function formatDate(iso: string | null): string {
    if (!iso) return "";
    const at = new Date(iso);
    if (Number.isNaN(at.getTime())) return "";
    const day = String(at.getUTCDate()).padStart(2, "0");
    const month = String(at.getUTCMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${at.getUTCFullYear()}`;
}

// --- Saving a score -------------------------------------------------------

export const PLAYER_MAX = 10;

// Mirrors the CHECK constraint of public.scores.player.
const PLAYER_PATTERN = /^[A-Z0-9_]{1,10}$/;

export type ScoreInput = { player: string; score: number; maxScore: number };

export type ScoreValidation =
    | { ok: true; value: { player: string; score: number } }
    | { ok: false; message: string };

// The modal already uppercases and truncates what it sends, but none of that
// reaches the server, so it runs again inside the action.
export function validateScore(input: ScoreInput): ScoreValidation {
    const player = input.player.trim().toUpperCase();

    if (!PLAYER_PATTERN.test(player)) {
        return {
            ok: false,
            message: "El nombre admite de 1 a 10 letras, números o guion bajo.",
        };
    }

    if (!Number.isInteger(input.score) || input.score < 0) {
        return { ok: false, message: "Esa puntuación no es válida." };
    }

    if (input.score > input.maxScore) {
        return { ok: false, message: "Esa puntuación no es válida." };
    }

    return { ok: true, value: { player, score: input.score } };
}

// What the server action hands back to the modal:
//   idle   → nothing sent yet; the name field and the button are shown
//   saved  → the row is in the database; green terminal line
//   failed → validation, rate limit or database failure; red terminal line
export type ScoreState =
    | { status: "idle" }
    | { status: "saved" }
    | { status: "failed"; message: string };

export const SCORE_IDLE: ScoreState = { status: "idle" };
