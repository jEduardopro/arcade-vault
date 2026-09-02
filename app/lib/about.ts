// Content of the about screen, ported from references/templates/home-about/about.jsx.
// Every literal is copied word for word, emoji included. Nothing here is derived:
// unlike the landing's game count, this page states no figure the catalogue could
// contradict.

import type { AccentColor } from "@/app/lib/home";

export type HighlightIconKind = "HEART" | "BROWSER" | "PLANT";

export type AboutHighlight = {
  icon: HighlightIconKind;
  text: string; // "HECHO CON ❤️ PARA JUGADORES"
  color: AccentColor;
};

export type ContactTip = {
  text: string; // "RESPUESTA EN 24-48H"
  led: "green" | "yellow" | "magenta"; // .tip-led, .tip-led.y, .tip-led.m
};

export const ABOUT_HIGHLIGHTS: readonly AboutHighlight[] = [
  { icon: "HEART", text: "HECHO CON ❤️ PARA JUGADORES", color: "magenta" },
  { icon: "BROWSER", text: "JUEGOS EN HTML — CORREN EN CUALQUIER NAVEGADOR", color: "cyan" },
  { icon: "PLANT", text: "PROYECTO EN CONSTANTE CRECIMIENTO", color: "green" },
];

export const CONTACT_TIPS: readonly ContactTip[] = [
  { text: "RESPUESTA EN 24-48H", led: "green" },
  { text: "SUGERENCIAS BIENVENIDAS", led: "yellow" },
  { text: "SIN SPAM, JAMÁS", led: "magenta" },
];

// The <span> count of the .div-pixels divider. The reference builds them with
// Array.from({ length: 24 }).
export const DIVIDER_PIXELS = 24;
