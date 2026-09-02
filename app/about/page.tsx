import type { Metadata } from "next";
import { AboutHighlightIcon } from "@/app/components/about-highlight-icon";
import { ContactForm } from "@/app/components/contact-form";
import { Reveal } from "@/app/components/reveal";
import { ABOUT_HIGHLIGHTS, CONTACT_TIPS, DIVIDER_PIXELS } from "@/app/lib/about";

export const metadata: Metadata = {
  title: "Acerca de",
  description:
    "Qué es Arcade Vault, por qué existe y cómo ponerse en contacto con el equipo.",
};

// About screen of references/templates/home-about/about.jsx. Everything but the
// contact form is static copy, so the page stays a Server Component: only the
// two scroll-in sections and the form itself are client islands.
export default function AboutPage() {
  return (
    <main className="av-main">
      <div className="about fade-in">
        {/* Without JavaScript no <Reveal> ever adds its "in" class, and .reveal
            sits at opacity: 0 — the divider and the whole contact section would
            be invisible. Same block as the landing, for the same reason. */}
        <noscript>
          <style>{".reveal { opacity: 1; transform: none; }"}</style>
        </noscript>

        {/* ABOUT */}
        <section className="about-hero">
          <div className="kicker pixel neon-yellow">▸ ACERCA DE</div>
          <h1 className="about-title">ACERCA DE ARCADE VAULT</h1>
          <p className="about-mission">
            ARCADE VAULT nació del amor por los videojuegos clásicos. Nuestra misión es
            preservar y celebrar los arcades que definieron una generación, haciéndolos
            accesibles para todos, en cualquier lugar y sin costo.
          </p>

          <div className="highlight-row">
            {ABOUT_HIGHLIGHTS.map((highlight, i) => (
              <div
                key={highlight.icon}
                className={"highlight " + highlight.color}
                // Inert, but kept from the reference: .highlight declares no
                // opacity of its own, so there is no staggered entrance to delay.
                style={{ transitionDelay: i * 80 + "ms" }}
              >
                <AboutHighlightIcon kind={highlight.icon} />
                <div className="hl-text pixel">{highlight.text}</div>
              </div>
            ))}
          </div>
        </section>

        {/* divider banner */}
        <Reveal className="about-divider" ariaHidden>
          <div className="div-bar"></div>
          <div className="div-pixels">
            {Array.from({ length: DIVIDER_PIXELS }).map((_, i) => (
              <span key={i} style={{ animationDelay: i * 80 + "ms" }}></span>
            ))}
          </div>
          <div className="div-bar"></div>
        </Reveal>

        {/* CONTACT */}
        <Reveal className="about-contact">
          <div className="contact-grid">
            <div className="contact-intro">
              <div className="kicker pixel neon-cyan">▸ CONTACTO</div>
              <h2 className="contact-title">CONTÁCTANOS</h2>
              <p className="contact-sub">
                ¿Tienes alguna sugerencia, quieres proponer un juego, o simplemente
                quieres saludar? Escríbenos.
              </p>
              <div className="contact-tips">
                {CONTACT_TIPS.map((tip) => (
                  <div className="tip" key={tip.text}>
                    <span
                      className={
                        "tip-led" +
                        (tip.led === "yellow" ? " y" : tip.led === "magenta" ? " m" : "")
                      }
                    ></span>
                    {tip.text}
                  </div>
                ))}
              </div>
            </div>

            <ContactForm />
          </div>
        </Reveal>
      </div>
    </main>
  );
}
