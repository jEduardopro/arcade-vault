import type { CoverArt as CoverArtClass } from "@/app/lib/games";

// The cover art is drawn entirely in CSS: each class in globals.css paints its
// own gradients and ::before / ::after shapes. This only picks the class.
export function CoverArt({ cover }: { cover: CoverArtClass }) {
  return <div className={"cover-bg " + cover} />;
}
