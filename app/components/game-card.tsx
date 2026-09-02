"use client";

// Game card of references/templates/biblioteca.jsx. The whole card is the link
// to the detail page, so JUGAR is a styled span instead of a nested button:
// .btn is a class-only rule, so it renders identically.

import Link from "next/link";
import { useRef } from "react";
import { CoverArt } from "@/app/components/cover-art";
import type { Game } from "@/app/lib/games";
import { formatScore } from "@/app/lib/scores";

export function GameCard({ game }: { game: Game }) {
  const tiltRef = useRef<HTMLAnchorElement>(null);

  const onMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = tiltRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `translateY(-6px) rotateX(${-py * 6}deg) rotateY(${px * 8}deg)`;
  };

  const onLeave = () => {
    const el = tiltRef.current;
    if (!el) return;
    el.style.transform = "";
  };

  return (
    <Link
      ref={tiltRef}
      href={`/games/${game.id}`}
      className="card"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div className="cover">
        <CoverArt cover={game.cover} />
        <div className="label">{game.cat}</div>
      </div>
      <div className="meta">
        <div className="title">{game.title}</div>
        <div className="desc">{game.short}</div>
        <div className="row">
          <div className="score-badge">
            <span>MEJOR PUNTUACIÓN</span>
            <b>{formatScore(game.best)}</b>
          </div>
          <span
            className={
              "btn " +
              (game.color === "magenta" ? "magenta" : game.color === "yellow" ? "yellow" : "")
            }
          >
            JUGAR
          </span>
        </div>
      </div>
    </Link>
  );
}
