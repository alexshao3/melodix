# DECISIONS.md — Architectural Decision Records (ADRs)

> Read this when: you're about to make (or undo) a non-obvious architectural
> choice. Append a new ADR using the template at the bottom whenever you do.
> ADRs are append-only — if you change your mind, add a new ADR that
> _supersedes_ the old one rather than editing it in place.

## Template

```
## ADR-NNNN · <short title>
**Date:** YYYY-MM-DD
**Status:** proposed | accepted | superseded by ADR-MMMM
**Context:** what forced the decision?
**Decision:** what we chose, in 1–3 sentences.
**Consequences:** trade-offs we accept, things now harder/easier.
```

---

## ADR-0001 · Monorepo (pnpm workspaces + Turborepo)

**Date:** 2026-04-26
**Status:** accepted
**Context:** Three apps (api, web, miniapp) share types, constants, and UI components. Splitting into separate repos forces awkward npm publishing or git-submodule workflows.
**Decision:** Use pnpm workspaces with two shared packages (`@melodix/shared`, `@melodix/ui`) and Turborepo for the task graph.
**Consequences:** Single `pnpm install`; cross-package edits land in one PR; Turborepo handles caching. Cost: contributors need pnpm 9+; CI must use `--frozen-lockfile`.

## ADR-0002 · Next.js 15 (App Router) + React 19 for both surfaces

**Date:** 2026-04-26
**Status:** accepted
**Context:** Web and Mini App share most behaviour. We want server components, streaming, and the latest motion primitives.
**Decision:** Both `apps/web` and `apps/miniapp` use Next.js 15 App Router on React 19, with framer-motion for animation.
**Consequences:** Same mental model in both apps; we can lift code freely. Cost: React 19 is recent — third-party libraries may lag; we standardise on libraries that already publish React-19-compatible types.

## ADR-0003 · NestJS for the backend instead of a Next API route

**Date:** 2026-04-26
**Status:** accepted
**Context:** The catalog logic, Jamendo proxy, auth, and Prisma persistence are large enough that colocating them in Next API routes would obscure structure and complicate testing.
**Decision:** Use a separate NestJS service at `apps/api` with modular folders per domain (auth, tracks, albums, …), global `/api` prefix, and class-validator DTOs.
**Consequences:** Clean module boundaries; Nest's DI helps testing. Cost: extra dev process; CORS configuration; we keep a single shared types package to avoid duplication.

## ADR-0004 · Demo fallback when `JAMENDO_CLIENT_ID` is unset

**Date:** 2026-04-26
**Status:** accepted
**Context:** First-time contributors and reviewers shouldn't need to register for an external API just to boot the app.
**Decision:** `JamendoService` returns the bundled `DEMO_TRACKS` array (36 SoundHelix royalty-free tracks) whenever no client id is configured. All flows (browse, search, play, like, playlist) work in this mode.
**Consequences:** The product demos cleanly out of the box. Cost: we must keep the demo dataset wide enough to exercise every UI surface; any new endpoint must include a demo path.

## ADR-0005 · Single `@melodix/shared` types package, no per-app duplication

**Date:** 2026-04-26
**Status:** accepted
**Context:** Three apps consume identical domain shapes (Track, Album, Artist, …). Duplicating breaks faster than it speeds anything up.
**Decision:** Every cross-app type lives in `packages/shared/src/types.ts` and is re-exported via `packages/shared/src/index.ts`. Apps never define their own version of these types.
**Consequences:** A single edit propagates everywhere. Cost: contributors must remember to edit `shared` rather than the local app file.

## ADR-0006 · The AGENTS-context system (this very tree)

**Date:** 2026-04-26
**Status:** accepted
**Context:** AI agents (Devin, Claude Code, Cursor, …) currently spend significant tokens re-discovering what the repo does, what's built, and what's planned. Knowledge silently rots if it lives only in commit history or scattered docs.
**Decision:** Adopt a small, stable set of files (`AGENTS.md` + `.agents/context/{PROJECT,ARCHITECTURE,FEATURES,ROADMAP,PROGRESS,STACK,GLOSSARY,DECISIONS}.md`) with explicit update rules enforced by the PR template, a `.agents/skills/update-context/SKILL.md` checklist, and a `context-freshness` CI warning. Token-efficiency goals: front-loaded TL;DRs, tables over prose, hierarchical reading guide.
**Consequences:** Any AI agent can reach productive work after reading 1–3 small files. Cost: every code-changing PR carries a small documentation tax; without discipline, the files rot — the CI workflow plus the SKILL checklist are the safety nets.

## ADR-0007 · Cross-package tests live under `apps/api/`

**Date:** 2026-04-26
**Status:** accepted
**Context:** We want a first Jest suite without standing up a separate Jest config in every workspace package. `apps/api` already has Jest + ts-jest installed.
**Decision:** Add a `moduleNameMapper` in `apps/api/jest.config.ts` that resolves `@melodix/shared` to `packages/shared/src`, and put cross-package tests (e.g. for `formatDuration` / `formatNumber`) under `apps/api/src/__shared-tests__/`. Long-term we may give each package its own Jest config; for now this trades a tiny bit of locality for not having to install Jest in every package.
**Consequences:** All tests run in one place via `pnpm --filter @melodix/api test`. Cost: tests for `packages/shared` live one directory away from the source they exercise; we mitigate this by naming the directory `__shared-tests__` so it's obvious.

## ADR-0008 · Reduced motion = global CSS rule + framer-motion `MotionConfig`

**Date:** 2026-04-26
**Status:** accepted
**Context:** Both apps use a mix of CSS keyframe animations (marquee, aurora gradients, audio wave) and JS-driven framer-motion `motion.*` components. Honouring `prefers-reduced-motion` per-component would be invasive and easy to forget.
**Decision:** Add one global media query in each app's `globals.css` that collapses `animation-duration`, `animation-iteration-count`, and `transition-duration` to `0.01ms` whenever the user has `prefers-reduced-motion: reduce`. Wrap each app in a `MotionRoot` (`<MotionConfig reducedMotion="user">`) so framer-motion's JS-driven animations follow the same preference automatically.
**Consequences:** New components inherit the preference for free — no per-component opt-in needed. Cost: very-rare exceptions (e.g. essential progress indicators that **must** keep moving) need a `motion-safe:` Tailwind variant or scoped CSS to override the global rule.

## ADR-0009 · Light-mode toggle via scoped `.light` CSS overrides

**Date:** 2026-04-26
**Status:** accepted
**Context:** The web app was originally written with a dark-only baseline — components reach for raw utilities like `text-white`, `bg-white/5`, `bg-black/40`, `border-white/10`, and there are zero `dark:` modifiers anywhere. We want a working light-mode toggle now without blocking on a multi-PR refactor that migrates every component to semantic tokens.
**Decision:** Use `next-themes` with `attribute="class"` so toggling adds `<html class="light">` (or `dark`). Define a small set of CSS variables on `:root` and `:root.light`, and add a tightly-scoped block of `.light .text-white`, `.light .bg-white\/5`, `.light .bg-black\/30`, … overrides in `apps/web/src/app/globals.css` that flip the dark-baseline utilities to readable values when light is active. Tailwind's existing `darkMode: 'class'` setting means future migrations to semantic tokens (or per-component `dark:` variants) are a no-op upgrade — they win on specificity over the override block.
**Consequences:** The toggle works today across the entire app surface. Cost: any new component that uses raw `text-white`/`bg-white/X` outside the existing override list will look wrong in light mode and must either reuse an already-overridden utility or be added to the override block. The long-term cleanup (semantic tokens) is on the ROADMAP backlog so the override block can shrink over time.
