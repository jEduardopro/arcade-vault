import type { Metadata } from "next";
import { HallBoard } from "@/app/components/hall-board";

export const metadata: Metadata = {
    title: "Salón de la Fama",
    description: "Las mejores puntuaciones de cada juego del Vault.",
};

// Hall of Fame screen of references/templates/salon.jsx. The board owns the
// whole layout because its selected tab drives the podium and the table.
export default function HallOfFamePage() {
    return (
        <main className="av-main">
            <HallBoard />
        </main>
    );
}
