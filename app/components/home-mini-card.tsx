import Link from "next/link";
import { CoverArt } from "@/app/components/cover-art";
import type { Game } from "@/app/lib/games";

// Compact game tile of the landing's preview rail, from
// references/templates/home-about/home.jsx. The reference put an onClick on a
// div; here the whole tile is the link, so it opens in a new tab, shows its
// target on hover and is reachable by keyboard. No display override is needed:
// .mini-rail is a grid, and grid items are blockified whatever their display.
export function HomeMiniCard({ game }: { game: Game }) {
  return (
    <Link className="mini-card" href={`/games/${game.id}`}>
      <div className="mini-cover">
        <CoverArt cover={game.cover} />
      </div>
      <div className="mini-meta">
        <div className="mini-title">{game.title}</div>
        <div className="mini-cat">{game.cat}</div>
      </div>
    </Link>
  );
}
