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

| Status | Feature                                               | Where                                                                                  | Notes                                                                                   |
| ------ | ----------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| ✅     | Trending / new releases / by-genre lists              | `apps/api/src/tracks/` + `apps/web/src/app/page.tsx`, `discover/page.tsx`              | Falls back to `DEMO_TRACKS` if no Jamendo key                                           |
| ✅     | Track / album / artist detail                         | API routes + Next pages + `packages/ui` cards                                          | Album & artist pages mostly via cards on home/discover today                            |
| ✅     | Unified search (tracks + albums + artists)            | `apps/api/src/search/` + `apps/web/src/app/search/SearchClient.tsx`                    |                                                                                         |
| ✅     | Global audio engine (web)                             | `apps/web/src/components/player/PlayerProvider.tsx`                                    | queue, history, shuffle, repeat (off/all/one), volume, MediaSession, keyboard shortcuts |
| ✅     | Compact audio engine (Mini App)                       | `apps/miniapp/src/components/PlayerProvider.tsx` + `MiniPlayer.tsx`                    | Same model, leaner UI                                                                   |
| ✅     | Album detail page (web + Mini App)                    | `apps/web/src/app/albums/[id]/page.tsx`, `apps/miniapp/src/app/albums/[id]/page.tsx`   | Hero header + full track list + Play album button                                       |
| ✅     | Artist detail page (web + Mini App)                   | `apps/web/src/app/artists/[id]/page.tsx`, `apps/miniapp/src/app/artists/[id]/page.tsx` | Circular header + bio + top tracks + Play top tracks                                    |
| 🔵     | Lyrics view                                           | —                                                                                      | See `ROADMAP.md`                                                                        |
| 🔵     | Server-side scrubbing / range-request streaming proxy | —                                                                                      | Today we stream Jamendo URLs directly                                                   |

## Library & social

| Status | Feature                                                             | Where                                                                                                                                                 | Notes                                                                                    |
| ------ | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| ✅     | User accounts (email/password)                                      | `apps/api/src/auth/` + `apps/web/src/app/login/`                                                                                                      | JWT, bcrypt-hashed                                                                       |
| ✅     | Telegram Mini App auth (`initData` verification)                    | `apps/api/src/auth/auth.service.ts` (`telegramLogin`) + `apps/miniapp/src/components/TelegramSync.tsx`                                                |                                                                                          |
| ✅     | Likes (per-user track likes)                                        | `apps/api/src/users/users.controller.ts` + `packages/ui/src/components/LikeButton.tsx`                                                                |                                                                                          |
| ✅     | Playlists CRUD + add/remove tracks                                  | `apps/api/src/playlists/`                                                                                                                             | Includes `PATCH /playlists/:id`, `PATCH /playlists/:id/reorder`, `DELETE /playlists/:id` |
| ✅     | Featured playlists (read-only home section)                         | `playlists.controller.ts:39`                                                                                                                          |                                                                                          |
| ✅     | "My Library" page (web + Mini App)                                  | `apps/web/src/app/library/page.tsx`, `apps/miniapp/src/app/library/page.tsx`                                                                          | 3 sections: your playlists / liked songs / recently played; auth-aware sign-in CTA       |
| ✅     | Playlist editor UI (rename, cover, public/private, reorder, delete) | `apps/web/src/components/playlist/{EditPlaylistDialog,EditableTrackList,PlaylistAuthBoundary}.tsx` + Mini App `PlaylistEditSheet`/`PlaylistOwnerGate` | Reorder via up/down arrows on web; slim sheet inside Telegram WebView (no DnD)           |
| 🟡     | Recently played history                                             | `apps/web/src/lib/recently-played.ts` + `apps/miniapp/src/lib/recently-played.ts`                                                                     | Per-device localStorage today; server-side history is on H2 backlog                      |
| 🔵     | Follow artists                                                      | —                                                                                                                                                     |                                                                                          |
| 🔵     | Share playlist via Telegram (deep link)                             | —                                                                                                                                                     |                                                                                          |

## Look & feel

| Status | Feature                                                   | Where                                                                                                               | Notes                                                                                    |
| ------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| ✅     | Aurora gradients & motion-rich Hero                       | `apps/web/src/components/hero/{Hero,OrbitingCovers,AudioVisualizer}.tsx`                                            |                                                                                          |
| ✅     | App shell (sidebar / topbar / mobile nav)                 | `apps/web/src/components/layout/`                                                                                   |                                                                                          |
| ✅     | Reusable card / pill / button library                     | `packages/ui/src/components/`                                                                                       |                                                                                          |
| ✅     | Telegram theme sync (light/dark + accent)                 | `apps/miniapp/src/components/TelegramSync.tsx`                                                                      | Reads `Telegram.WebApp.themeParams`                                                      |
| ✅     | Dark / light mode on web with toggle                      | `apps/web/src/components/theme/{ThemeProvider,ThemeToggle}.tsx` + `apps/web/src/app/globals.css` `.light` overrides | `next-themes` (attribute=class), defaults `dark`, persists user choice; toggle in TopBar |
| ✅     | Reduced-motion mode (`prefers-reduced-motion` everywhere) | `apps/{web,miniapp}/src/app/globals.css` + `MotionRoot` (`MotionConfig reducedMotion="user"`)                       | CSS animations & framer-motion both respect user pref                                    |
| ✅     | Skeleton loaders                                          | `packages/ui/src/components/Skeleton.tsx` + per-route `loading.tsx`                                                 | Shimmer skeletons for tracks/cards/headers; honour reduced-motion                        |

## Backend / platform

| Status | Feature                                        | Where                                                                                                                                            | Notes                                                                                                                                       |
| ------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅     | NestJS modular API with global `/api` prefix   | `apps/api/src/main.ts`                                                                                                                           |                                                                                                                                             |
| ✅     | Class-validator DTOs + global `ValidationPipe` | `apps/api/src/main.ts`                                                                                                                           |                                                                                                                                             |
| ✅     | Prisma schema + seed                           | `apps/api/prisma/`                                                                                                                               |                                                                                                                                             |
| ✅     | Jamendo HTTP client + demo fallback            | `apps/api/src/jamendo/jamendo.service.ts`                                                                                                        |                                                                                                                                             |
| ✅     | CORS configurable via `CORS_ORIGIN`            | `apps/api/src/main.ts`                                                                                                                           |                                                                                                                                             |
| ✅     | CI: typecheck + lint + build on every PR       | `.github/workflows/ci.yml`                                                                                                                       |                                                                                                                                             |
| 🟡     | Tests                                          | `apps/api/src/{auth,playlists,cache,jamendo}/*.spec.ts`, `apps/api/src/__shared-tests__/format.spec.ts`                                          | 38 Jest tests across AuthService, PlaylistsService, CacheService, JamendoService cache integration, shared formatters; web/miniapp untested |
| ✅     | Rate limiting on the public API                | `apps/api/src/app.module.ts` (global `ThrottlerGuard`) + `auth.controller.ts` (`@Throttle({ auth })`) + `health.controller.ts` (`@SkipThrottle`) | Buckets: `short` 60/10s, `default` 300/60s, `auth` 10/60s. ADR-0013                                                                         |
| ✅     | Redis cache for Jamendo responses              | `apps/api/src/cache/{cache.module,cache.service}.ts` + `jamendo.service.ts` (`cache.wrap` around every idempotent call)                          | TTL 600s (10 min); per-method namespaced keys; gracefully no-ops when `REDIS_URL` is unset (ADR-0012)                                       |
| 🔵     | OpenAPI / Swagger docs                         | —                                                                                                                                                |                                                                                                                                             |
| 🔵     | Observability (structured logs, metrics)       | —                                                                                                                                                |                                                                                                                                             |

## Developer experience

| Status | Feature                                            | Where                                                     | Notes                                          |
| ------ | -------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------- |
| ✅     | Turborepo task graph                               | `turbo.json`                                              |                                                |
| ✅     | Pnpm workspaces                                    | `pnpm-workspace.yaml`                                     |                                                |
| ✅     | Shared TS config                                   | `tsconfig.base.json`                                      |                                                |
| ✅     | Prettier formatting                                | `.prettierrc` + `pnpm format`                             |                                                |
| ✅     | `AGENTS.md` + `.agents/context/` AI-context system | this very tree                                            |                                                |
| ✅     | Pre-commit hooks (lint-staged + prettier)          | `.husky/pre-commit` + `package.json` `lint-staged` config | Runs `prettier --write` on staged source files |
| 🔵     | E2E tests (Playwright)                             | —                                                         |                                                |
| 🔵     | Storybook for `packages/ui`                        | —                                                         |                                                |
