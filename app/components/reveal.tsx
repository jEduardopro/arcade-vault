"use client";

// Scroll-in animation of references/templates/home-about/home.jsx. The reference
// ran a single useReveal() hook that queried document for every ".reveal" node;
// here each section observes its own element instead, so a section is a section
// and nothing walks the DOM looking for siblings.
//
// The class starts as "reveal" (opacity: 0 in globals.css) and gains "in" once
// the element shows up. Two escape hatches keep that from hiding content: with
// prefers-reduced-motion, or in a browser without IntersectionObserver, the
// section reveals on mount without ever being observed. The no-JavaScript case
// is covered by the <noscript> override in app/page.tsx.

import { useEffect, useRef, useState } from "react";

export function Reveal({
  children,
  className,
  ariaHidden,
}: {
  children: React.ReactNode;
  className?: string;
  // For decorative sections that still animate in — the pixel divider on
  // /about is the only one. It reveals like any other section but has nothing
  // to announce, so it stays out of the accessibility tree.
  ariaHidden?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  // Server render and first client render agree on false, so hydration matches
  // and the class only changes afterwards.
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (shown) return;

    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      // Revealed from a timeout rather than straight from the effect body: React
      // forbids a synchronous setState here, and a timer — unlike
      // requestAnimationFrame — still fires in a background tab, so the content
      // can never stay stuck at opacity 0.
      const timer = setTimeout(() => setShown(true), 0);
      return () => clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            // One-shot: the section never animates out again.
            observer.unobserve(entry.target);
            setShown(true);
          }
        }
      },
      { threshold: 0.12 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [shown]);

  return (
    <section
      ref={ref}
      className={[className, "reveal", shown ? "in" : ""].filter(Boolean).join(" ")}
      aria-hidden={ariaHidden || undefined}
    >
      {children}
    </section>
  );
}
