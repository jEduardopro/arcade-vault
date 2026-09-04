"use client";

// Access form of references/templates/auth.jsx. No real authentication: the
// submitted name is stored as the fake session and the user lands on the
// library. The social buttons are inert, exactly as in the reference.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/app/lib/session";

export type AuthTab = "in" | "up";

export function AuthForm({ initialTab = "in" }: { initialTab?: AuthTab }) {
    const router = useRouter();
    const { signIn } = useSession();
    // Which tab opens comes from the ?tab search param, resolved on the server by
    // app/login/page.tsx. It only seeds the state: switching tabs stays local.
    const [tab, setTab] = useState<AuthTab>(initialTab);
    const [user, setUser] = useState("");
    const [pass, setPass] = useState("");
    const [email, setEmail] = useState("");

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        signIn({ name: (user || "PLAYER1").toUpperCase().slice(0, 10) });
        router.push("/games");
    };

    return (
        <>
            <div className="auth-tabs">
                <button
                    className={tab === "in" ? "on" : ""}
                    onClick={() => setTab("in")}
                >
                    INICIAR SESIÓN
                </button>
                <button
                    className={tab === "up" ? "on" : ""}
                    onClick={() => setTab("up")}
                >
                    CREAR CUENTA
                </button>
            </div>

            <form onSubmit={submit}>
                <div className="field">
                    <label>Usuario</label>
                    <input
                        value={user}
                        onChange={(e) => setUser(e.target.value)}
                        placeholder="px_kai"
                    />
                </div>
                {tab === "up" && (
                    <div className="field slide-in">
                        <label>Correo electrónico</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="jugador@vault.gg"
                        />
                    </div>
                )}
                <div className="field">
                    <label>Contraseña</label>
                    <input
                        type="password"
                        value={pass}
                        onChange={(e) => setPass(e.target.value)}
                        placeholder="••••••••"
                    />
                </div>

                <button
                    className="btn lg"
                    type="submit"
                    style={{ width: "100%", marginTop: 8 }}
                >
                    {tab === "in" ? "ENTRAR AL VAULT" : "CREAR Y JUGAR"}
                </button>
            </form>

            <button
                className="btn ghost"
                style={{ width: "100%", marginTop: 10 }}
                onClick={() => {
                    signIn(null);
                    router.push("/games");
                }}
            >
                JUGAR COMO INVITADO
            </button>

            <div className="auth-divider">O CONTINÚA CON</div>
            <div className="social">
                <button className="btn ghost" type="button">
                    ◆ GOOGLE
                </button>
                <button className="btn ghost" type="button">
                    ▣ GITHUB
                </button>
            </div>

            <div
                style={{
                    marginTop: 18,
                    textAlign: "center",
                    fontSize: 11,
                    color: "var(--ink-faint)",
                    letterSpacing: "0.1em",
                }}
            >
                AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
            </div>
        </>
    );
}
