// Footer of references/templates/app.jsx, inline styles included: the reference
// keeps these off styles.css, and globals.css is a byte-for-byte port of it.
export function SiteFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--line)",
        padding: "20px 32px",
        textAlign: "center",
        color: "var(--ink-faint)",
        fontFamily: "var(--mono)",
        fontSize: 11,
        letterSpacing: "0.16em",
      }}
    >
      © 2026 ARCADE VAULT · HECHO CON PIXELES Y NEÓN · v2.6.0
    </footer>
  );
}
