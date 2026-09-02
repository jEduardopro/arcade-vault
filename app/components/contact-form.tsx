"use client";

// Contact form of references/templates/home-about/about.jsx. The reference's
// onSubmit only flipped a flag, so it had two states: the form and a success
// terminal. Sending real mail adds two more — in flight and failed — and they
// are what the extra machinery here is for.
//
// The fields are controlled so a failed send never costs the user their text:
// REINTENTAR goes back to the form with everything still in it.

import { useActionState, useEffect, useRef, useState } from "react";
import { sendContactMessage } from "@/app/actions/contact";
import { CONTACT_IDLE, type ContactState } from "@/app/lib/contact";

const EMPTY = { name: "", email: "", message: "" };

const SHAKE_MS = 400;

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(
    sendContactMessage,
    CONTACT_IDLE,
  );
  const [form, setForm] = useState(EMPTY);
  const [shake, setShake] = useState(false);
  // Client-side copy of the reference's empty check. It never reaches the
  // server, so it is kept apart from the message the action sends back.
  const [localError, setLocalError] = useState<string | null>(null);
  // The settled state the user dismissed. Every action run returns a fresh
  // object, so identity is enough to tell "this terminal was closed" from "a
  // new result arrived".
  const [dismissed, setDismissed] = useState<ContactState | null>(null);

  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startShake = () => {
    setShake(true);
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    shakeTimer.current = setTimeout(() => setShake(false), SHAKE_MS);
  };

  // A shake left running when the component goes away would set state on an
  // unmounted tree.
  useEffect(() => () => {
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
  }, []);

  // The server rejecting the input shakes the form too: same feedback whether
  // the check that failed ran here or there. Both setState calls come off a
  // timer rather than the effect body — React forbids the synchronous one, the
  // same reason reveal.tsx reveals from a timeout.
  useEffect(() => {
    if (state.status !== "invalid") return;
    const start = setTimeout(() => setShake(true), 0);
    const stop = setTimeout(() => setShake(false), SHAKE_MS);
    return () => {
      clearTimeout(start);
      clearTimeout(stop);
    };
  }, [state]);

  const settled = state.status === "sent" || state.status === "failed";
  const showTerminal = settled && state !== dismissed;

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      // Cancels the action: React skips it when the submit event's default is
      // prevented, so an empty form never reaches the network.
      event.preventDefault();
      setLocalError("Rellena los tres campos antes de enviar.");
      startShake();
      return;
    }
    setLocalError(null);
  };

  if (showTerminal && state.status === "sent") {
    return (
      <div className="contact-form">
        <div className="terminal-success">
          <div className="term-bar">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body">
            <div className="line">
              <span className="prompt">vault@arcade:~$</span> ./send_message --to=team
            </div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success">
              &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS,{" "}
              {state.name.toUpperCase()}.<span className="caret">_</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <button
                className="btn ghost"
                type="button"
                onClick={() => {
                  setForm(EMPTY);
                  setDismissed(state);
                }}
              >
                ENVIAR OTRO MENSAJE
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showTerminal && state.status === "failed") {
    return (
      <div className="contact-form">
        <div className="terminal-success terminal-error">
          <div className="term-bar">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body">
            <div className="line">
              <span className="prompt">vault@arcade:~$</span> ./send_message --to=team
            </div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line">[ERROR] Conexión rechazada…</div>
            <div className="line success" role="alert">
              &gt; {state.message}
              <span className="caret">_</span>
            </div>
            <div style={{ marginTop: 18 }}>
              {/* Keeps `form` untouched: the text the user wrote is still there. */}
              <button
                className="btn ghost"
                type="button"
                onClick={() => setDismissed(state)}
              >
                REINTENTAR
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const error = localError ?? (state.status === "invalid" ? state.message : null);

  return (
    <form
      className={"contact-form" + (shake ? " shake" : "")}
      action={formAction}
      onSubmit={onSubmit}
      noValidate
    >
      <div className="field">
        <label htmlFor="contact-name">NOMBRE</label>
        <input
          id="contact-name"
          name="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="px_kai"
          disabled={isPending}
        />
      </div>
      <div className="field">
        <label htmlFor="contact-email">CORREO ELECTRÓNICO</label>
        <input
          id="contact-email"
          name="email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="jugador@vault.gg"
          disabled={isPending}
        />
      </div>
      <div className="field">
        <label htmlFor="contact-message">MENSAJE</label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Cuéntanos qué tienes en mente…"
          disabled={isPending}
        ></textarea>
      </div>
      {error ? (
        <p
          className="pixel"
          role="alert"
          style={{
            margin: "0 0 12px",
            fontSize: 9,
            lineHeight: 1.6,
            letterSpacing: "0.12em",
            color: "var(--magenta)",
          }}
        >
          {error}
        </p>
      ) : null}
      <button
        className="btn xl press"
        type="submit"
        style={{ width: "100%" }}
        disabled={isPending}
      >
        {isPending ? "ENVIANDO…" : "▶  ENVIAR MENSAJE"}
      </button>
    </form>
  );
}
