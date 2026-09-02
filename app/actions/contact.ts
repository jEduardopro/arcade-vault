"use server";

// Contact form delivery (SPEC 03). A server action rather than a route handler:
// the API key never leaves the server, there is no public endpoint to hammer,
// and useActionState gives the form its pending state for free.
//
// Every message handed back to the client is a fixed literal. The detail of a
// Resend failure — which can name the key, the domain or the recipient — goes to
// the server log and nowhere else.

import { headers } from "next/headers";
import { Resend } from "resend";
import {
  type ContactState,
  validateContact,
} from "@/app/lib/contact";
import { takeContactSlot } from "@/app/lib/rate-limit";

const SUBJECT = "Arcade Vault · Nuevo mensaje de contacto";

const RATE_LIMITED =
  "Demasiados envíos desde esta conexión. Inténtalo en unos minutos.";
const NOT_CONFIGURED = "El servicio de correo no está configurado.";
const SEND_FAILED = "No pudimos enviar el mensaje. Inténtalo de nuevo.";

// x-forwarded-for carries a comma-separated chain; the client is the first hop.
// Missing behind a proxy that does not set it, everything shares the "unknown"
// bucket — the quota gets stricter, never laxer, which is the right way to fail.
async function clientIp(): Promise<string> {
  const forwarded = (await headers()).get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

function plainBody(name: string, email: string, message: string): string {
  return [
    `Nombre: ${name}`,
    `Correo: ${email}`,
    "",
    message,
  ].join("\n");
}

export async function sendContactMessage(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const validation = validateContact({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    message: String(formData.get("message") ?? ""),
  });

  if (!validation.ok) {
    return { status: "invalid", message: validation.message };
  }

  const { name, email, message } = validation.value;

  // Checked after validation so a malformed submission never burns a slot.
  if (!takeContactSlot(await clientIp())) {
    return { status: "failed", message: RATE_LIMITED };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[contact] Missing configuration. Set RESEND_API_KEY, CONTACT_TO_EMAIL and CONTACT_FROM_EMAIL.",
      );
      return { status: "failed", message: NOT_CONFIGURED };
    }

    // Console mode: whoever clones the repo can exercise the whole screen
    // without signing up for Resend.
    console.info(
      `[contact] No mail sent (missing configuration).\n${plainBody(name, email, message)}`,
    );
    return { status: "sent", name };
  }

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to,
      replyTo: email,
      subject: SUBJECT,
      text: plainBody(name, email, message),
    });

    if (error) {
      // Spelled out field by field: Resend's error object has no own enumerable
      // properties for the dev logger to serialise, so passing it whole prints
      // "{}" and tells whoever reads the log nothing.
      console.error(
        `[contact] Resend rejected the message: ${error.name} (${error.statusCode}) — ${error.message}`,
      );
      return { status: "failed", message: SEND_FAILED };
    }
  } catch (cause) {
    console.error("[contact] Could not reach Resend:", cause);
    return { status: "failed", message: SEND_FAILED };
  }

  return { status: "sent", name };
}
