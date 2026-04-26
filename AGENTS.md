# AGENTS.md — Read this first

> Single entry-point for any AI agent (Devin, Claude Code, Cursor, Codex, etc.)
> working on Melodix. Read **this file fully**, then jump to the focused
> context files under [`.agents/context/`](.agents/context/) only as needed.
> The whole context system is designed to fit in a small token budget so the
> agent can reach productive work in **one read**.

---

## 0. 30-second TL;DR

|                       |                                                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Project**           | Melodix — Creative-Commons music streaming web app + Telegram Mini App                                                |
| **Stack**             | Next.js 15 (App Router) + React 19 / NestJS 10 + Prisma 6 + Postgres / pnpm + Turborepo                               |
| **Layout**            | Monorepo: `apps/{api,web,miniapp}` + `packages/{shared,ui}`                                                           |
| **Source of music**   | Jamendo API, with a bundled 36-track demo fallback so the app boots without keys                                      |
| **Status**            | Initial scaffold complete; building toward a fully animated, motion-rich Spotify-class UX with a Telegram-native twin |
| **Test commands**     | `pnpm typecheck` · `pnpm lint` · `pnpm build` · `pnpm test`                                                           |
| **CI**                | `.github/workflows/ci.yml` — typecheck → lint → build (must be green)                                                 |
| **Branch convention** | `devin/<unix-ts>-<slug>`                                                                                              |
| **PR template**       | [`.github/pull_request_template.md`](.github/pull_request_template.md)                                                |

If the task is trivial (typo, comment, doc tweak), the table above is enough.
Otherwise, follow the routing in §2.

---

## 1. The context system

```
AGENTS.md                    ← you are here (entry point + routing)
.agents/
  context/
    PROJECT.md               ← what & why  (vision, audience, success criteria)
    ARCHITECTURE.md          ← how         (modules, data flow, key files)
    FEATURES.md              ← feature catalog with status (done / partial / planned)
    ROADMAP.md               ← what's next (short / mid / long-term horizons)
    PROGRESS.md              ← running log of completed work (changelog-ish)
    STACK.md                 ← exact versions, ports, env vars, scripts
    GLOSSARY.md              ← domain terms used throughout the codebase
    DECISIONS.md             ← architectural decision records (ADRs)
  skills/
    update-context/SKILL.md  ← how AI must keep these files in sync
README.md                    ← human-facing onboarding (kept short, links here)
```

**Design goals**

1. **Token-efficient.** Every file front-loads a TL;DR. Tables and bullet lists, not prose.
2. **Stable filenames.** Agents memorise the layout once and re-use it forever.
3. **Hierarchical reads.** A small task only needs `AGENTS.md`; only deep tasks need `ARCHITECTURE.md` + `FEATURES.md`.
4. **Self-maintaining.** Every PR that changes code MUST also update the relevant context file (see §4).

---

## 2. Routing — "I want to do X, what do I read?"

| Your task                                      | Read these (in order)                                                              | Skip the rest |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- | ------------- |
| Fix a typo / copy tweak                        | `AGENTS.md` only                                                                   | yes           |
| Tweak existing UI component                    | `AGENTS.md` → `ARCHITECTURE.md` §Web                                               | yes           |
| Add a new API endpoint                         | `AGENTS.md` → `ARCHITECTURE.md` §API → `STACK.md` §API                             | yes           |
| Add a new feature end-to-end                   | `AGENTS.md` → `FEATURES.md` → `ARCHITECTURE.md` → `ROADMAP.md`                     | no            |
| Plan future work / propose features            | `AGENTS.md` → `ROADMAP.md` → `FEATURES.md`                                         | yes           |
| Investigate a bug                              | `AGENTS.md` → `ARCHITECTURE.md` (find the module) → `PROGRESS.md` (recent changes) | yes           |
| Onboard / general "what is this repo" question | `AGENTS.md` → `PROJECT.md`                                                         | yes           |
| Make an architectural change                   | `AGENTS.md` → `ARCHITECTURE.md` → `DECISIONS.md` (and add a new ADR)               | no            |

> **Heuristic:** if the task touches code, you almost certainly need `ARCHITECTURE.md`.
> If the task touches _behaviour the user sees_, you also need `FEATURES.md`.

---

## 3. Working agreements (must follow)

- **Package manager:** `pnpm` only. Never run `npm install` or `yarn`.
- **Node:** ≥ 20. **pnpm:** ≥ 9. CI uses Node 22 + pnpm 9.15.1.
- **Type safety:** strict TS everywhere. No `any`, no `@ts-ignore` without a comment justifying it.
- **Shared types:** all cross-app types live in [`packages/shared/src/types.ts`](packages/shared/src/types.ts). Don't duplicate them per app.
- **API routes:** every new endpoint goes through a NestJS controller in `apps/api/src/<module>/`, validated with `class-validator` DTOs.
- **UI components:** if a component will be reused across `apps/web` and `apps/miniapp`, put it in `packages/ui/`. Otherwise keep it local.
- **Styling:** Tailwind CSS, with motion via `framer-motion`. No CSS-in-JS libraries.
- **Music sources:** treat `Track.source` as enum-like (`'jamendo' | 'demo' | 'fma' | 'upload'`) — if you add a new source, update `packages/shared/src/types.ts`.
- **Demo fallback must keep working** when `JAMENDO_CLIENT_ID` is unset — never make the boot path require external network calls.
- **Don't break the Mini App.** Anything that reads `window` or `document` must be guarded; the Mini App runs inside Telegram WebView with restricted APIs.

---

## 4. The auto-update contract (MOST IMPORTANT)

> Without this, the context files rot and stop being trustworthy. Then future AI
> sessions waste tokens re-reading source code. **Don't let that happen.**

**Every PR that changes code MUST also update the context files** — same PR, same commit-set. Rules:

| If your PR...                                                                                     | You MUST update...                                                        |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Adds / removes / renames a top-level module (e.g. a new NestJS module, a new Next.js route group) | `ARCHITECTURE.md`                                                         |
| Adds / removes / changes a user-facing feature                                                    | `FEATURES.md` (and tick the corresponding ROADMAP item if it was planned) |
| Completes or starts work on a roadmap item                                                        | `ROADMAP.md` + add an entry in `PROGRESS.md`                              |
| Bumps a major dependency, changes a port, env var, or script                                      | `STACK.md`                                                                |
| Introduces a new domain term                                                                      | `GLOSSARY.md`                                                             |
| Makes a non-obvious architectural choice (auth model, caching strategy, …)                        | `DECISIONS.md` (append an ADR)                                            |
| Anything else of substance                                                                        | At minimum, append a 1-line entry to `PROGRESS.md`                        |

The PR template ([`.github/pull_request_template.md`](.github/pull_request_template.md)) has a checklist enforcing this.
A CI workflow ([`.github/workflows/context-freshness.yml`](.github/workflows/context-freshness.yml)) emits a warning when code changes without any context file change — read that warning before merging.

The full step-by-step procedure for AI agents is in [`.agents/skills/update-context/SKILL.md`](.agents/skills/update-context/SKILL.md). Treat it as a strict checklist.

---

## 5. Quick command cheatsheet

```bash
pnpm install                            # install everything
pnpm dev                                # web + miniapp + api in parallel
pnpm typecheck && pnpm lint && pnpm build   # full local CI

# API only:
pnpm --filter @melodix/api dev
pnpm --filter @melodix/api prisma:generate
pnpm --filter @melodix/api prisma:migrate
pnpm --filter @melodix/api prisma:seed

# Web / Mini App only:
pnpm --filter @melodix/web dev          # → http://localhost:3000
pnpm --filter @melodix/miniapp dev      # → http://localhost:3001
```

See `.agents/context/STACK.md` for the full env-var / port matrix.
