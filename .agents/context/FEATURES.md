# FEATURES.md — Feature catalog

> Read this when: you need to know "is X already built?", "what does Y do
> today?", or you're adding a new user-facing capability.
>
> **Status legend:** `✅ done` · `🟡 partial` (works but rough or missing
> polish) · `🔵 planned` (in [`ROADMAP.md`](ROADMAP.md), not started) ·
> `⛔ removed`.
>
> **Update rule:** if your PR changes user-visible behaviour, you MUST update
> the matching row here in the same PR.

## Catalog & playback

| Status | Feature                                               | Where                                                                     | Notes                                                                                   |
| ------ | ----------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| ✅     | Trending / new releases / by-genre lists              | `apps/api/src/tracks/` + `apps/web/src/app/page.tsx`, `discover/page.tsx` | Falls back to `DEMO_TRACKS` if no Jamendo key                                           |
| ✅     | Track / album / artist detail                         | API routes + Next pages + `packages/ui` cards                             | Album & artist pages mostly via cards on home/discover today                            |
| ✅     | Unified search (tracks + albums + artists)            | `apps/api/src/search/` + `apps/web/src/app/search/SearchClient.tsx`       |                                                                                         |
| ✅     | Global audio engine (web)                             | `apps/web/src/components/player/PlayerProvider.tsx`                       | queue, history, shuffle, repeat (off/all/one), volume, MediaSession, keyboard shortcuts |
| ✅     | Compact audio engine (Mini App)                       | `apps/miniapp/src/components/PlayerProvider.tsx` + `MiniPlayer.tsx`       | Same model, leaner UI                                                                   |
| 🟡     | Album / artist dedicated pages with full track lists  | partial — cards exist, dedicated pages thin                               | Tracked in `ROADMAP.md`                                                                 |
| 🔵     | Lyrics view                                           | —                                                                         | See `ROADMAP.md`                                                                        |
| 🔵     | Server-side scrubbing / range-request streaming proxy | —                                                                         | Today we stream Jamendo URLs directly                                                   |

## Library & social

| Status | Feature                                                             | Where                                                                                                  | Notes                                             |
| ------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| ✅     | User accounts (email/password)                                      | `apps/api/src/auth/` + `apps/web/src/app/login/`                                                       | JWT, bcrypt-hashed                                |
| ✅     | Telegram Mini App auth (`initData` verification)                    | `apps/api/src/auth/auth.service.ts` (`telegramLogin`) + `apps/miniapp/src/components/TelegramSync.tsx` |                                                   |
| ✅     | Likes (per-user track likes)                                        | `apps/api/src/users/users.controller.ts` + `packages/ui/src/components/LikeButton.tsx`                 |                                                   |
| ✅     | Playlists CRUD + add/remove tracks                                  | `apps/api/src/playlists/`                                                                              |                                                   |
| ✅     | Featured playlists (read-only home section)                         | `playlists.controller.ts:39`                                                                           |                                                   |
| 🟡     | "My Library" page                                                   | `apps/web/src/app/library/page.tsx` exists                                                             | Functionality is thin — no playlist editor UI yet |
| 🔵     | Playlist editor UI (rename, reorder, set cover, set public/private) | —                                                                                                      |                                                   |
| 🔵     | Recently played history (server-side)                               | —                                                                                                      | Today only in client `history` queue              |
| 🔵     | Follow artists                                                      | —                                                                                                      |                                                   |
| 🔵     | Share playlist via Telegram (deep link)                             | —                                                                                                      |                                                   |

## Look & feel

| Status | Feature                                                   | Where                                                                    | Notes                               |
| ------ | --------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------- |
| ✅     | Aurora gradients & motion-rich Hero                       | `apps/web/src/components/hero/{Hero,OrbitingCovers,AudioVisualizer}.tsx` |                                     |
| ✅     | App shell (sidebar / topbar / mobile nav)                 | `apps/web/src/components/layout/`                                        |                                     |
| ✅     | Reusable card / pill / button library                     | `packages/ui/src/components/`                                            |                                     |
| ✅     | Telegram theme sync (light/dark + accent)                 | `apps/miniapp/src/components/TelegramSync.tsx`                           | Reads `Telegram.WebApp.themeParams` |
| 🟡     | Dark mode on web                                          | partial — defaults dark, no toggle                                       |                                     |
| 🔵     | Reduced-motion mode (`prefers-reduced-motion` everywhere) | —                                                                        |                                     |
| 🔵     | Skeleton loaders for every list                           | —                                                                        |                                     |

## Backend / platform

| Status | Feature                                        | Where                                                                  | Notes                              |
| ------ | ---------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------- |
| ✅     | NestJS modular API with global `/api` prefix   | `apps/api/src/main.ts`                                                 |                                    |
| ✅     | Class-validator DTOs + global `ValidationPipe` | `apps/api/src/main.ts`                                                 |                                    |
| ✅     | Prisma schema + seed                           | `apps/api/prisma/`                                                     |                                    |
| ✅     | Jamendo HTTP client + demo fallback            | `apps/api/src/jamendo/jamendo.service.ts`                              |                                    |
| ✅     | CORS configurable via `CORS_ORIGIN`            | `apps/api/src/main.ts`                                                 |                                    |
| ✅     | CI: typecheck + lint + build on every PR       | `.github/workflows/ci.yml`                                             |                                    |
| 🟡     | Tests                                          | `pnpm test` runs `jest --passWithNoTests` only — **no real tests yet** | First test suite is a roadmap item |
| 🔵     | Rate limiting on the public API                | —                                                                      |                                    |
| 🔵     | Redis cache for Jamendo responses              | docker-compose includes Redis but it isn't wired in                    |                                    |
| 🔵     | OpenAPI / Swagger docs                         | —                                                                      |                                    |
| 🔵     | Observability (structured logs, metrics)       | —                                                                      |                                    |

## Developer experience

| Status | Feature                                            | Where                         | Notes |
| ------ | -------------------------------------------------- | ----------------------------- | ----- |
| ✅     | Turborepo task graph                               | `turbo.json`                  |       |
| ✅     | Pnpm workspaces                                    | `pnpm-workspace.yaml`         |       |
| ✅     | Shared TS config                                   | `tsconfig.base.json`          |       |
| ✅     | Prettier formatting                                | `.prettierrc` + `pnpm format` |       |
| ✅     | `AGENTS.md` + `.agents/context/` AI-context system | this very tree                |       |
| 🔵     | Pre-commit hooks (lint-staged + format)            | —                             |       |
| 🔵     | E2E tests (Playwright)                             | —                             |       |
| 🔵     | Storybook for `packages/ui`                        | —                             |       |
