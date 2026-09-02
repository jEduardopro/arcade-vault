"use client";

// Nav of references/templates/nav.jsx. The hash router of the reference becomes
// real routes, so the active state is derived from the pathname.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/app/lib/session";

export function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, signOut } = useSession();

  // "Inicio" only lights on the landing itself, so it has to match exactly.
  // "Biblioteca" covers the whole /games segment, the way the reference kept it
  // lit for the detail and player screens.
  const isHome = pathname === "/";
  const isLibrary = pathname.startsWith("/games");
  const isHall = pathname === "/hall-of-fame";
  const isAuth = pathname === "/login";

  const close = () => setOpen(false);

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={close}>
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={isHome ? "active" : ""} onClick={close}>
            Inicio
          </Link>
          <Link href="/games" className={isLibrary ? "active" : ""} onClick={close}>
            Biblioteca
          </Link>
          <Link href="/hall-of-fame" className={isHall ? "active" : ""} onClick={close}>
            Salón de la Fama
          </Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <button className="btn ghost auth-btn" onClick={signOut}>
            {user.name} ▾
          </button>
        ) : (
          <Link href="/login" className="btn auth-btn" onClick={close}>
            Iniciar Sesión
          </Link>
        )}
        <button className="btn ghost hamburger" onClick={() => setOpen(true)} aria-label="Menú">
          ≡
        </button>
      </nav>

      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={close}
      ></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>
          MENÚ
        </div>
        <Link href="/" className={isHome ? "active" : ""} onClick={close}>
          Inicio
        </Link>
        <Link href="/games" className={isLibrary ? "active" : ""} onClick={close}>
          Biblioteca
        </Link>
        <Link href="/hall-of-fame" className={isHall ? "active" : ""} onClick={close}>
          Salón de la Fama
        </Link>
        <Link href="/login" className={isAuth ? "active" : ""} onClick={close}>
          {user ? "Cuenta" : "Iniciar Sesión"}
        </Link>
        <div style={{ flex: 1 }}></div>
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
