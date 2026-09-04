import Link from "next/link";
import { HomeFeatureIcon } from "@/app/components/home-feature-icon";
import { HomeMiniCard } from "@/app/components/home-mini-card";
import { HomeSilhouettes } from "@/app/components/home-silhouettes";
import { Reveal } from "@/app/components/reveal";
import { getGames } from "@/app/lib/catalogue";
import {
    HOME_FAQ,
    HOME_FEATURES,
    HOME_TICKER,
    HOME_TOP,
    homeStats,
    PLAN_PERKS,
    PREVIEW_COUNT,
} from "@/app/lib/home";
import { formatScore } from "@/app/lib/scores";

// Landing of references/templates/home-about/home.jsx. The library it used to
// hold now lives at /games. Everything here is static copy except the preview
// rail and the game count, which come from the catalogue, so the page stays a
// Server Component: the reference's onClick/navigate calls become <Link>s, and
// only the scroll-in sections below the hero are client islands.
export default async function HomePage() {
    const games = await getGames();
    return (
        <main className="av-main">
            <div className="home fade-in">
                {/* Without JavaScript no <Reveal> ever adds its "in" class, and .reveal
            sits at opacity: 0 — everything below the hero would be invisible.
            This block lives in the body, after globals.css, so at equal
            specificity it wins the cascade and no !important is needed. */}
                <noscript>
                    <style>{".reveal { opacity: 1; transform: none; }"}</style>
                </noscript>

                {/* HERO */}
                <section className="home-hero">
                    <HomeSilhouettes />
                    <div className="home-hero-inner">
                        <div className="hero-eyebrow pixel neon-yellow">
                            ▸ INSERTA UNA MONEDA<span className="blink">_</span>
                        </div>
                        <h1 className="home-title">
                            <span className="line-1">EL ARCADE</span>
                            <span className="line-2">CLÁSICO ESTÁ</span>
                            <span className="line-3">DE VUELTA</span>
                        </h1>
                        <p className="home-sub">
                            Juega los mejores clásicos directamente en tu
                            navegador.
                            <br />
                            Sin descargas. Sin costo. Solo diversión.
                        </p>
                        <div className="home-ctas">
                            <Link className="btn xl pulse" href="/games">
                                ▶ EXPLORAR JUEGOS
                            </Link>
                            <Link
                                className="btn xl magenta"
                                href="/login?tab=signup"
                            >
                                ✦ CREAR CUENTA
                            </Link>
                        </div>
                    </div>

                    {/* The reference nests this inside .home-hero-inner, where its
              `position: absolute; bottom: -20px` resolves against the
              vertically centred text box and lands on top of the CTAs. Hanging
              it off .home-hero instead pins it to the bottom of the viewport-tall
              section, which is where a scroll hint belongs; the inline `bottom`
              replaces the negative offset that would now fall outside the
              section's `overflow: hidden`. */}
                    <div
                        className="hero-scroll"
                        aria-hidden="true"
                        style={{ bottom: 24 }}
                    >
                        <span>DESLIZA</span>
                        <span className="arrow">▼</span>
                    </div>
                </section>

                {/* WHY */}
                <Reveal className="home-section">
                    <div className="section-head">
                        {/* Braces, not a bare text node: "//" would read as a comment. */}
                        <div className="kicker pixel neon-magenta">
                            {"// 01"}
                        </div>
                        <h2 className="section-title">
                            ¿POR QUÉ ARCADE VAULT?
                        </h2>
                        <div className="section-rule"></div>
                    </div>
                    <div className="feature-grid">
                        {HOME_FEATURES.map((feature, i) => (
                            <div
                                key={feature.title}
                                className={"feature-card " + feature.color}
                                // Inert, but kept from the reference: .feature-card declares no
                                // opacity of its own, so there is no staggered entrance to delay.
                                style={{ transitionDelay: i * 80 + "ms" }}
                            >
                                <HomeFeatureIcon kind={feature.icon} />
                                <div className="ft-title pixel">
                                    {feature.title}
                                </div>
                                <div className="ft-desc">{feature.desc}</div>
                            </div>
                        ))}
                    </div>
                </Reveal>

                {/* GAMES PREVIEW */}
                <Reveal className="home-section">
                    <div className="section-head">
                        <div className="kicker pixel neon-cyan">{"// 02"}</div>
                        <h2 className="section-title">
                            JUEGOS DISPONIBLES AHORA
                        </h2>
                        <div className="section-rule"></div>
                    </div>
                    <div className="mini-rail">
                        {games.slice(0, PREVIEW_COUNT).map((game) => (
                            <HomeMiniCard key={game.id} game={game} />
                        ))}
                    </div>
                    <div style={{ textAlign: "center", marginTop: 24 }}>
                        <Link className="btn lg" href="/games">
                            VER TODOS LOS JUEGOS →
                        </Link>
                    </div>
                </Reveal>

                {/* STATS */}
                <Reveal className="home-stats">
                    <div className="stats-inner">
                        {homeStats(games.length).map((stat, i) => (
                            <div
                                key={stat.unit}
                                className="stat-block"
                                // Inert like the feature cards': .stat-block has no opacity of
                                // its own. Kept to stay literal to the reference.
                                style={{ transitionDelay: i * 90 + "ms" }}
                            >
                                <div className="stat-n neon-yellow">
                                    {stat.n}
                                </div>
                                <div className="stat-u pixel">{stat.unit}</div>
                                <div className="stat-s">{stat.sub}</div>
                            </div>
                        ))}
                    </div>
                </Reveal>

                {/* RECENT ACTIVITY / LEADERBOARD */}
                <Reveal className="home-section">
                    <div className="section-head">
                        <div className="kicker pixel neon-yellow">
                            {"// 03"}
                        </div>
                        <h2 className="section-title">ACTIVIDAD EN VIVO</h2>
                        <div className="section-rule"></div>
                    </div>
                    <div className="activity-grid">
                        <div className="activity-card">
                            <div className="ac-head">
                                <div className="ac-title pixel">
                                    ▸ ÚLTIMAS PUNTUACIONES
                                </div>
                            </div>
                            <div className="ticker">
                                {HOME_TICKER.map((row, i) => (
                                    <div
                                        key={row.player}
                                        className="tick-row"
                                        // .tick-row starts at opacity 0 and animates in with
                                        // `forwards`, so this stagger is the real thing, unlike the
                                        // inert transitionDelays above.
                                        style={{
                                            animationDelay: i * 60 + "ms",
                                        }}
                                    >
                                        <span
                                            className={"tk-p neon-" + row.color}
                                        >
                                            {row.player}
                                        </span>
                                        <span className="tk-mid">
                                            ▸ {row.game}
                                        </span>
                                        <span className="tk-s">
                                            +{formatScore(row.score)}
                                        </span>
                                        <span className="tk-t">{row.ago}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="activity-card">
                            <div className="ac-head">
                                <div className="ac-title pixel neon-magenta">
                                    ▸ TOP JUGADORES · HOY
                                </div>
                                <Link className="lb-link" href="/hall-of-fame">
                                    VER SALÓN →
                                </Link>
                            </div>
                            <div className="top-list">
                                {HOME_TOP.map((row, i) => (
                                    <div
                                        key={row.player}
                                        className={
                                            "top-row" +
                                            (i === 0
                                                ? " top1"
                                                : i === 1
                                                  ? " top2"
                                                  : i === 2
                                                    ? " top3"
                                                    : "")
                                        }
                                    >
                                        <span className="tp-rk">
                                            #{String(row.rank).padStart(2, "0")}
                                        </span>
                                        <span className="tp-bar">
                                            <span
                                                className="tp-fill"
                                                style={{
                                                    width: 100 - i * 16 + "%",
                                                }}
                                            ></span>
                                        </span>
                                        <span className="tp-p">
                                            {row.player}
                                        </span>
                                        <span className="tp-s">
                                            {formatScore(row.score)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Reveal>

                {/* PRICING */}
                <Reveal className="home-section">
                    <div className="section-head">
                        <div className="kicker pixel neon-green">{"// 04"}</div>
                        <h2 className="section-title">PRECIOS</h2>
                        <div className="section-rule"></div>
                    </div>
                    <div className="pricing-grid">
                        <div className="price-card">
                            <div className="pc-label pixel">PLAN ÚNICO</div>
                            <div className="pc-name pixel">JUGADOR VAULT</div>
                            <div className="pc-amount">
                                <span className="pc-amount-n">$0</span>
                                <span className="pc-amount-u">/ SIEMPRE</span>
                            </div>
                            <div className="pc-tag">
                                SIN TRUCOS · SIN LETRA PEQUEÑA
                            </div>
                            <ul className="pc-list">
                                {PLAN_PERKS.map((perk) => (
                                    <li key={perk}>{perk}</li>
                                ))}
                            </ul>
                            <Link
                                className="btn xl pulse"
                                style={{ width: "100%" }}
                                href="/login?tab=signup"
                            >
                                EMPEZAR GRATIS →
                            </Link>
                            <div className="pc-foot">
                                No pedimos tarjeta. Nunca lo haremos.
                            </div>
                            <div className="pc-stamp pixel">
                                FREE
                                <br />
                                PLAY
                            </div>
                        </div>

                        <div className="pricing-faq">
                            {HOME_FAQ.map((item) => (
                                <div className="faq-item" key={item.q}>
                                    <div className="faq-q pixel">{item.q}</div>
                                    <div className="faq-a">{item.a}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Reveal>

                {/* FINAL CTA */}
                <Reveal className="home-final">
                    <h2 className="final-title pixel">¿LISTO PARA JUGAR?</h2>
                    <Link className="btn xl pulse final-cta" href="/games">
                        INSERTAR MONEDA →
                    </Link>
                    <div className="final-tag">
                        Gratis. Sin registro obligatorio. Empieza en segundos.
                    </div>
                </Reveal>
            </div>
        </main>
    );
}
