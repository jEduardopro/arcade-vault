import type { Metadata } from "next";
import { AuthForm } from "@/app/components/auth-form";

export const metadata: Metadata = {
  title: "Acceso al Sistema",
  description: "Entra al Vault o juega como invitado.",
};

// Access screen of references/templates/auth.jsx. The card header is static
// text, so only the form below it is a client island.
export default function LoginPage() {
  return (
    <main className="av-main">
      <div className="av-auth-wrap fade-in">
        <div className="auth-card">
          <div className="auth-header">
            <div className="mark"></div>
            <h2 className="neon-cyan">ARCADE VAULT</h2>
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: "var(--ink-faint)",
                letterSpacing: "0.16em",
                marginTop: 6,
              }}
            >
              ACCESO AL SISTEMA · v2.6
            </div>
          </div>

          <AuthForm />
        </div>
      </div>
    </main>
  );
}
