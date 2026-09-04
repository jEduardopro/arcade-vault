import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Cartucho no encontrado",
};

// The reference has no 404 screen, so this one is built out of its own classes
// (.av-hero, .pixel, .btn) instead of new ones: globals.css stays a port of
// styles.css.
export default function NotFound() {
    return (
        <main className="av-main">
            <div className="fade-in">
                <section className="av-hero">
                    <h1 className="flicker">404</h1>
                    <div className="sub">
                        CARTUCHO NO ENCONTRADO <span className="blink">_</span>
                    </div>
                    <p
                        className="mono"
                        style={{
                            marginTop: 24,
                            color: "var(--ink-dim)",
                            fontSize: 13,
                            letterSpacing: "0.1em",
                        }}
                    >
                        Esta ranura está vacía. El juego que buscas no vive en
                        el Vault.
                    </p>
                    <div
                        style={{
                            marginTop: 32,
                            display: "flex",
                            gap: 12,
                            justifyContent: "center",
                            flexWrap: "wrap",
                        }}
                    >
                        <Link className="btn lg" href="/games">
                            VOLVER AL VAULT
                        </Link>
                        <Link className="btn ghost lg" href="/hall-of-fame">
                            SALÓN DE LA FAMA
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    );
}
