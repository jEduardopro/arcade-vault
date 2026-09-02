// Contract shared by the contact form and its server action (SPEC 03).
// Deliberately dependency-free — no "use server", no next/* imports — so the
// client island can import the types and the limits without dragging any
// server code into the browser bundle.

export const CONTACT_LIMITS = {
  name: 80,
  email: 160,
  message: 4000,
} as const;

export type ContactInput = { name: string; email: string; message: string };

// What the server action hands back to the form:
//   idle    → nothing sent yet; the three fields are shown
//   invalid → the data failed validation; the form shakes and stays put
//   sent    → mail delivered (or logged in console mode); green terminal
//   failed  → transport, configuration or rate-limit failure; red terminal
export type ContactState =
  | { status: "idle" }
  | { status: "invalid"; message: string }
  | { status: "sent"; name: string }
  | { status: "failed"; message: string };

export const CONTACT_IDLE: ContactState = { status: "idle" };

// Loose on purpose: something@something.something with no whitespace. Rejecting
// the obvious typos is the point; deciding whether an address exists is
// Resend's job, not a regular expression's.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ContactValidation =
  | { ok: true; value: ContactInput }
  | { ok: false; message: string };

// The browser already blocks empty fields and checks type="email", but neither
// of those reaches the server, so this runs again inside the action.
export function validateContact(input: ContactInput): ContactValidation {
  const value: ContactInput = {
    name: input.name.trim(),
    email: input.email.trim(),
    message: input.message.trim(),
  };

  if (!value.name || !value.email || !value.message) {
    return { ok: false, message: "Rellena los tres campos antes de enviar." };
  }

  if (!EMAIL_PATTERN.test(value.email)) {
    return { ok: false, message: "Ese correo no parece válido." };
  }

  if (
    value.name.length > CONTACT_LIMITS.name ||
    value.email.length > CONTACT_LIMITS.email ||
    value.message.length > CONTACT_LIMITS.message
  ) {
    return { ok: false, message: "El mensaje es demasiado largo." };
  }

  return { ok: true, value };
}
