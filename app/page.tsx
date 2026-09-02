import { LibraryGrid } from "@/app/components/library-grid";

// Library screen of references/templates/biblioteca.jsx. The hero is static
// text, so it ships as HTML; only the filters and the grid are a client island.
export default function LibraryPage() {
  return (
    <main className="av-main">
      <div className="fade-in">
        <section className="av-hero">
          <h1 className="flicker">ARCADE VAULT</h1>
          <div className="sub">
            INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
          </div>
        </section>

        <LibraryGrid />
      </div>
    </main>
  );
}
