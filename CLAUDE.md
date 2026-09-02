# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — a platform for playing games online and competing for the highest score.
The repository is currently a fresh Next.js scaffold: `app/page.tsx` is still the
create-next-app landing page, and no game, leaderboard, or backend code exists yet.

The README specifies a **spec-driven workflow**: features are designed with `/spec` and then
built with `/spec-impl`, following the conventions of
[Klerith/fernando-skills](https://github.com/Klerith/fernando-skills). Those skills are not
vendored in the repo; install them with `npx skills@latest add Klerith/fernando-skills`.
Prefer writing/updating a spec before implementing a feature.

## Commands

```bash
npm run dev     # dev server (also regenerates the agent-rules block in AGENTS.md)
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint (flat config, eslint-config-next core-web-vitals + typescript)
```

There is no test runner configured. If tests are added, record the invocation here,
including how to run a single test.

Type checking has no dedicated script — `next build` type-checks, or run
`npx tsc --noEmit` for a faster check.

## Stack and conventions

- **Next.js 16 App Router** with React 19. Everything lives under `app/`; there is no
  `src/` directory and no Pages Router.
- **Always consult `node_modules/next/dist/docs/` before writing Next.js code.** This
  version differs from older Next.js in ways that are easy to get wrong; the
  getting-started guides are in `node_modules/next/dist/docs/01-app/01-getting-started/`
  and topic guides in `.../02-guides/`.
- **Route props are globally typed.** `app/layout.tsx` uses `LayoutProps<"/">` — a global
  type generated per-route into `.next/types/`, not an import. Use `PageProps<"/route">` /
  `LayoutProps<"/route">` instead of hand-written props interfaces; run `next dev` or
  `next build` after adding a route so its type is generated.
- **Tailwind CSS v4**, configured entirely in CSS. There is no `tailwind.config.*`:
  `app/globals.css` does `@import "tailwindcss"` and declares design tokens in an
  `@theme inline` block. Add theme values there, not in a JS config.
- Dark mode is driven by `prefers-color-scheme` (CSS variables in `globals.css` plus
  `dark:` utilities), not a class toggle.
- Fonts come from `next/font/google` (Geist / Geist Mono) and are exposed as the
  `--font-geist-sans` / `--font-geist-mono` CSS variables wired into `@theme inline`.
- TypeScript is `strict`, and `@/*` maps to the repo root (e.g. `@/app/...`).
