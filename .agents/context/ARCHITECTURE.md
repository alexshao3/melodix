# ARCHITECTURE.md — How the system is built

> Read this when: you need to touch code. This is the **map** — which file owns
> which responsibility. Cross-references use `path:line` for fast jumps.

## TL;DR

```
                ┌──────────────────────────┐
                │       packages/shared     │  ← single source of types & constants
                │  types.ts · constants.ts  │
                └──────────┬───────────────┘
                           │ imported by all 3 apps
            ┌──────────────┼──────────────────────────┐
            │              │                          │
   ┌────────▼────────┐ ┌───▼───────────┐  ┌───────────▼───────────┐
   │   apps/api      │ │   apps/web    │  │     apps/miniapp      │
   │   NestJS 10     │ │   Next.js 15  │  │     Next.js 15        │
   │   port 4000     │ │   port 3000   │  │     port 3001         │
   │   /api/...      │ │   App Router  │  │     App Router        │
   └────────┬────────┘ └───┬───────────┘  └───────────┬───────────┘
            │              │                          │
            ▼              ▼                          ▼
       Postgres       packages/ui          Telegram WebApp SDK
       (Prisma 6)     (shared React)       (window.Telegram.WebApp)
            │
            ▼
    Jamendo API (or DEMO_TRACKS fallback)
```

## Repo layout

```
apps/
  api/          NestJS backend, Prisma, JWT auth, Jamendo proxy
  web/          Next.js 15 main site (motion-rich)
  miniapp/      Next.js Telegram Mini App (slimmer twin)
  admin/        Next.js admin dashboard (track CRUD, source toggle, bulk upload)
packages/
  shared/       TypeScript domain types + API_ROUTES + helpers
  ui/           Reusable React components (cards, buttons, motion primitives)
e2e/                  Playwright specs (smoke + authed); ADR-0015 + ADR-0018
playwright.config.ts  Boots production builds of api+web via webServer
docker-compose.yml         Production self-host: all apps + Cloudflare Tunnel
docker-compose.dev.yml     Local dev: Postgres + Redis only (no env vars needed)
.dockerignore              Docker build exclusions
.env.production.example    Template for production env vars
apps/api/Dockerfile        Multi-stage NestJS + Prisma production image
apps/web/Dockerfile        Multi-stage Next.js standalone production image
apps/miniapp/Dockerfile    Multi-stage Next.js standalone production image
apps/admin/Dockerfile      Multi-stage Next.js standalone production image (port 3002)
turbo.json                 Turborepo task graph
pnpm-workspace.yaml        Workspace globs
```

## `apps/api` — NestJS backend (port 4000, prefix `/api`)

Bootstrapped at [`apps/api/src/main.ts`](../../apps/api/src/main.ts). Module
graph at [`apps/api/src/app.module.ts`](../../apps/api/src/app.module.ts).

| Module                  | Folder                 | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Public routes                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AuthModule`            | `auth/`                | Register / login / Telegram `initData` verification, JWT issuance                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `POST /api/auth/{register,login,telegram}`                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `UsersModule`           | `users/`               | Current user, likes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `GET /api/me`, `GET/POST/DELETE /api/me/likes/...`                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `HistoryModule`         | `history/`             | Server-side recently-played log (record / list / clear)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `GET /api/me/history?limit=N`, `POST /api/me/history`, `DELETE /api/me/history` (all auth-gated). Caps at 200 rows/user, 30s same-track dedup. ADR-0014                                                                                                                                                                                                                                                                                                                    |
| `FollowsModule`         | `follows/`             | Follow / unfollow artists                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `GET /api/me/follows` (hydrated artists), `GET /api/me/follows/ids` (cheap "is following?" check), `POST /api/me/follows/:artistId`, `DELETE /api/me/follows/:artistId` (all auth-gated). ADR-0016                                                                                                                                                                                                                                                                         |
| `LyricsModule`          | `lyrics/`              | Track lyrics via the free `lyrics.ovh` provider                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `GET /api/lyrics?artist=…&title=…` → `{ artist, title, lyrics: string \| null, source }`. Public, soft-throttled (120/60s). Redis-cached 24h on hit / 1h on miss; graceful "none" on upstream error. ADR-0017                                                                                                                                                                                                                                                              |
| `RecommendationsModule` | `recommendations/`     | Item-item collaborative filtering over `Like` + popularity + cold-start fallback                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `GET /api/recommendations/me` (authed; fans out from the user's 50 most recent likes, cosine similarity, drops already-liked, falls back to popularity → trending), `GET /api/recommendations/popular` (public), `GET /api/recommendations/similar/:trackId` (public, "listeners also liked"). All three behind a 5-min Redis cache via `CacheService.wrap`. Resolves heterogeneous track ids (`jm_<jamendoId>` / `demo_t_<id>` / cuid) via `TracksService.byId`. ADR-0024 |
| `TracksModule`          | `tracks/`              | Trending, new releases, by-genre, by-id                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `GET /api/tracks/{trending,new-releases,genre/:g,:id}`. Feed endpoints accept `?source=jamendo\|upload` (omitted = merged feed). `TrackSourceFilter` is exported for cross-app reuse; controller rejects unknown values with 400.                                                                                                                                                                                                                                          |
| `AlbumsModule`          | `albums/`              | List & fetch albums                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `GET /api/albums`, `GET /api/albums/:id`                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `ArtistsModule`         | `artists/`             | List & fetch artists; source-aware (Jamendo + uploaded)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `GET /api/artists`, `GET /api/artists/:id` → `{ artist, tracks, albums }`. Uploaded artists resolved via Prisma when `MusicSource('upload')` is enabled; Jamendo discography via `JamendoService.getArtistAlbums` (cached `/albums?artist_id=…`).                                                                                                                                                                                                                          |
| `PlaylistsModule`       | `playlists/`           | Featured + CRUD + add/remove tracks + edit metadata + reorder + delete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `GET /api/playlists/{featured,:id}`, `POST /api/playlists`, `POST/DELETE /api/playlists/:id/tracks/...`, `PATCH /api/playlists/:id`, `PATCH /api/playlists/:id/reorder`, `DELETE /api/playlists/:id`                                                                                                                                                                                                                                                                       |
| `SearchModule`          | `search/`              | Unified search across tracks/albums/artists                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `GET /api/search`                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `JamendoModule`         | `jamendo/`             | HTTP client for Jamendo + `DEMO_TRACKS` fallback (cache-wrapped)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | (internal)                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `CacheModule`           | `cache/`               | Redis-backed JSON cache (`get` / `set` / `wrap` / `invalidate`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | (internal); gracefully no-ops when `REDIS_URL` is unset (ADR-0012)                                                                                                                                                                                                                                                                                                                                                                                                         |
| `AdminAuthModule`       | `admin-auth/`          | Separate admin login + JWT strategy (`admin-jwt`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `POST /api/admin/auth/login`, `POST /api/admin/auth/setup` (admin-guarded). ADR-0020                                                                                                                                                                                                                                                                                                                                                                                       |
| `AdminTracksModule`     | `admin-tracks/`        | CRUD for uploaded tracks (multipart audio+cover → S3-compatible storage) + bulk operations                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `POST/GET/PATCH/DELETE /api/admin/tracks` (admin-guarded). Bulk: `POST /api/admin/tracks/bulk-delete` and `PATCH /api/admin/tracks/bulk-genre` (cap 200 ids/request, return `{ deleted/updated, notFound }` partition; bulk-delete is best-effort against object storage). Bulk routes are declared before `:id` parameterized routes so Nest's declaration-order matching doesn't swallow them.                                                                           |
| `MusicSourcesModule`    | `music-sources/`       | Toggle music sources (jamendo/upload) on/off                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `GET/PATCH /api/admin/sources` (admin-guarded). Auto-seeds default sources on boot.                                                                                                                                                                                                                                                                                                                                                                                        |
| `StorageModule`         | `storage/`             | Strategy-pattern storage facade: `StorageService` delegates to one of two `StorageBackend` impls picked by `STORAGE_BACKEND=s3\|postgres` at boot (see ADR-0026). `S3StorageBackend` (`backends/s3.backend.ts`) uploads via `@aws-sdk/client-s3` to any S3-compatible bucket (B2 default, also R2/Storj/MinIO/AWS S3). `PostgresStorageBackend` (`backends/postgres.backend.ts`) writes blobs to the `storage_objects` Prisma model as `bytea` and serves them through a sibling `StorageController` with HTTP Range support (`SELECT substring(bytes from … for …)` so seeks fetch only the chunk they need). | `GET /api/storage/:folder/:filename` (public, range-aware, postgres backend only); `GET /api/admin/storage/info` (admin-guarded, surfaces backend name + object count + total bytes for the dashboard "Storage backend" stat card).                                                                                                                                                                                                                                        |
| `PrismaModule`          | `prisma/`              | Prisma client singleton                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | (internal)                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `HealthController`      | `health.controller.ts` | Liveness probe (`@SkipThrottle`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `GET /api/health`                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

**Rate limiting.** `ThrottlerModule.forRoot([...])` registers three buckets:
`short` (60 req / 10 s), `default` (300 req / 60 s), and `auth` (10 req / 60 s,
opt-in via `@Throttle({ auth: ... })`). Bound globally as `APP_GUARD` in
[`apps/api/src/app.module.ts`](../../apps/api/src/app.module.ts). See ADR-0013.

**Caching.** `CacheService` ([`apps/api/src/cache/cache.service.ts`](../../apps/api/src/cache/cache.service.ts))
wraps `ioredis`. `JamendoService` calls `cache.wrap(key, 600, loader)` around
every idempotent fetch — `trending`, `new-releases`, `genre`, `search-tracks`,
`search-albums`, `search-artists`, `track`, `album`, `artist`, `album-tracks`,
`artist-tracks`, `artist-albums`. Cache keys are namespaced under `jamendo:`. Missing
`REDIS_URL` degrades to no-cache.

**Persistence.** Prisma schema at [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma).
Models: `User`, `Artist`, `Album`, `Track`, `Playlist`, `PlaylistTrack`, `Like`.
Demo seed: [`apps/api/prisma/seed.ts`](../../apps/api/prisma/seed.ts).

**Validation.** Global `ValidationPipe` with `whitelist: true, transform: true`.
DTOs use `class-validator` decorators (see e.g. [`auth.controller.ts`](../../apps/api/src/auth/auth.controller.ts)).

**Auth.** JWT via `@nestjs/jwt` + Passport (`auth/jwt.strategy.ts`). Telegram
login validates `initData` per the [official spec](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app).

**Catalog source.** `JamendoService` ([`apps/api/src/jamendo/jamendo.service.ts`](../../apps/api/src/jamendo/jamendo.service.ts))
calls Jamendo when `JAMENDO_CLIENT_ID` is set, otherwise serves the curated
`DEMO_TRACKS` array from [`demo-data.ts`](../../apps/api/src/jamendo/demo-data.ts).

## `apps/web` — main site (port 3000)

Next.js 15 App Router, React 19, Tailwind, framer-motion. Entry: [`src/app/layout.tsx`](../../apps/web/src/app/layout.tsx).

```
src/app/
  page.tsx            Home (Hero + featured sections)
  discover/page.tsx   Discover by genre / mood
  search/page.tsx     Search (server) + SearchClient.tsx (client)
  library/page.tsx    Auth-gated user library: 3 sections (your playlists / liked / recently played) + CreatePlaylistDialog
  login/page.tsx      Login / register
  albums/[id]/        Album detail page
  artists/[id]/       Artist detail page
  playlists/[id]/     Playlist detail + PlayPlaylistButton + PlaylistAuthBoundary (owner-only edit)
  loading.tsx         Skeleton fallback for the home route (others co-located per route)
src/components/
  hero/               Hero, OrbitingCovers, AudioVisualizer
  layout/             AppShell, Sidebar, MobileNav, TopBar
  library/            CreatePlaylistDialog (used by /library)
  motion/             MotionRoot ← framer-motion `MotionConfig reducedMotion="user"`
  player/             PlayerProvider, PlayerBar  ← global audio engine; pushes recently-played
  playlist/           EditPlaylistDialog, EditableTrackList, PlaylistOwnerControls, PlaylistAuthBoundary
  sections/           Section wrappers, TrackList, TrackGrid, PlaylistGrid, MoodPills, PlayTracksButton
  theme/              ThemeProvider (next-themes), ThemeToggle (Sun/Moon button)
src/lib/
  api.ts              fetch helpers wrapping NEXT_PUBLIC_API_URL
  cn.ts               className helper
  recently-played.ts  localStorage helper for client-side play history (ADR-0010)
```

**Audio engine.** `PlayerProvider` ([`player/PlayerProvider.tsx`](../../apps/web/src/components/player/PlayerProvider.tsx))
holds `currentTrack`, `queue`, `history`, `isPlaying`, `position`, `duration`,
`volume`, `shuffle`, `repeat`. Wires `<audio>` ref + MediaSession + keyboard
shortcuts. **All web playback flows go through it.**

**State.** Zustand is available but currently only the Player context is in
use. Add stores under `src/lib/store/` if you need more.

## `apps/miniapp` — Telegram Mini App (port 3001)

Next.js 15 + React 19, **leaner** than web. Mirrors the same library but with
Telegram-native chrome.

```
src/app/
  page.tsx           Mini home
  discover/, search/, library/, playlists/[id]/, albums/[id]/, artists/[id]/
src/components/
  PlayerProvider.tsx     leaner audio engine (no MediaSession-heavy bits); pushes recently-played
  MiniPlayer.tsx         compact player UI
  LibraryClient.tsx      /library content (your playlists / liked / recently played)
  CreatePlaylistSheet.tsx slim bottom sheet for creating a playlist
  PlaylistEditSheet.tsx   slim bottom sheet (rename / cover / public-private / delete)
  PlaylistOwnerGate.tsx   resolves /me on mount and gates the edit sheet
  MiniNav.tsx            bottom nav (Home / Discover / Library / Search)
  MiniTrackRow.tsx       single-line track row
  MotionRoot.tsx         framer-motion `MotionConfig reducedMotion="user"`
  TelegramSync.tsx       reads window.Telegram.WebApp, expands viewport, syncs theme, triggers haptics
src/lib/
  api.ts                 same fetch wrapper, different base URL
  recently-played.ts     localStorage mirror of the web helper
  telegram.ts            typed wrapper around window.Telegram.WebApp
```

**Constraint.** Anything DOM-specific must be guarded with
`typeof window !== 'undefined'` — the Mini App SSR-renders inside a Telegram
WebView whose API surface is restricted.

## `apps/admin` — admin dashboard (port 3002)

Next.js 15 + React 19 + Tailwind, Phase 2 of the admin system (ADR-0021). Talks
to the Phase-1 admin API endpoints (`/api/admin/auth/*`, `/api/admin/tracks`,
`/api/admin/sources`) using a separate JWT stored under `melodix.admin.token`
in `localStorage` so it never collides with the public-app user token.

```
src/app/
  layout.tsx                AuthProvider + ToastProvider + framer-motion MotionConfig
  globals.css               admin theme tokens + .admin-input / .admin-card primitives
  login/page.tsx            login + first-time-setup form (auto-detects 403 → switches mode)
  (dashboard)/
    layout.tsx              <RequireAdmin> + <AdminShell> wrapper
    page.tsx                dashboard: stats, recent uploads, source quick-toggles
    tracks/page.tsx         search + paginated list + edit/delete row actions
    tracks/upload/page.tsx  single track upload (drag-drop audio + cover, metadata)
    tracks/bulk/page.tsx    bulk upload queue (multi-file, shared artist/genre, per-row status)
    sources/page.tsx        full source toggle list with descriptions
src/components/
  AuthProvider.tsx          { ready, admin, signIn, signOut } context; reads JWT payload locally
  RequireAdmin.tsx          client-side gate that redirects to /login?next=...
  AdminShell.tsx            sticky sidebar + mobile pill nav + sign-out card
  PageHeader.tsx            shared page hero with aurora background
  EditTrackDialog.tsx       PATCH /api/admin/tracks/:id (multipart cover replace)
  ConfirmDialog.tsx         destructive-action confirm modal
  Toast.tsx                 framer-motion-driven toast queue
src/lib/
  api.ts                    typed admin client (login, setup, tracks CRUD, sources toggle)
  format.ts                 formatBytes / formatDuration / formatRelativeDate / decodeJwtPayload
```

**Auth model.** The admin token is stored in `localStorage` and decoded client-side
_only_ to surface the username in the shell — every privileged call goes through
the API which re-validates the JWT against `admin-jwt` strategy (ADR-0020). Logout
just clears `localStorage` and redirects to `/login`.

**Setup flow.** `/login` doubles as the first-time-setup screen: if no admin
exists, the user clicks "First-time setup", picks a username + password, and the
form calls `POST /api/admin/auth/setup` followed by `POST /api/admin/auth/login`.
Once an admin exists, setup returns `403` and the form auto-switches to login
mode with a friendly message (the API uses a `Serializable` transaction to
prevent the TOCTOU race fixed in #20).

## `packages/shared` — types & constants

- [`types.ts`](../../packages/shared/src/types.ts) — `Artist`, `Album`,
  `Track`, `Playlist`, `User`, `AuthResponse`, `PaginatedResponse`,
  `SearchResults`, `RepeatMode`, etc. **Edit here, not per-app.**
- [`constants.ts`](../../packages/shared/src/constants.ts) — `APP_NAME`,
  `GENRES`, `API_ROUTES`, `formatDuration`, `formatNumber`,
  `DEFAULT_PAGE_SIZE`, `MAX_QUEUE_SIZE`.

## `packages/ui` — shared React components

`AlbumCard`, `ArtistCard`, `TrackCard`, `PlaylistCard`, `GenrePill`,
`GradientButton`, `AudioWave`, `Waveform` (peaks-driven SVG scrubber, see
ADR-0023), `LikeButton`, `Marquee`, `Spinner`, `Skeleton`,
`TrackSkeletonRow`, `CardSkeletonGrid`, `HeaderSkeleton`. Use these before
building yours from scratch.

## Tests

Unit tests live alongside the API (`apps/api/`) and run via `pnpm --filter
@melodix/api test`. The Jest config at
[`apps/api/jest.config.ts`](../../apps/api/jest.config.ts) maps
`@melodix/shared` to the shared package's `src/` so cross-package tests can
live next to the API surface. Today's suites:

- `auth/auth.service.spec.ts` — password register/login, Telegram
  `initData` verification (real HMAC-SHA256), `telegramLogin` upsert.
- `playlists/playlists.service.spec.ts` — CRUD, ordering, ownership.
- `cache/cache.service.spec.ts` — `wrap()` semantics, no-op fallback.
- `jamendo/jamendo.service.spec.ts` — DEMO_TRACKS fallback, cache integration.
- `history/history.service.spec.ts` — record / dedup / 200-row cap / list / clear.
- `tracks/peaks.util.spec.ts` — `normalizePeaks` validator (drops non-arrays / non-finite values, clamps to `[0, 1]`).
- `admin-tracks/admin-tracks.service.spec.ts` — bulk delete + bulk set-genre partition logic, object-storage delete failure tolerance, dedup, and the empty-input fast path. Uses an in-memory `prisma.track` stub modelling `findMany` / `deleteMany` / `updateMany`.
- `tracks/tracks.service.spec.ts` — `?source=` filter behaviour (merged default, jamendo-only, upload-only, globally-disabled-source returns `[]`, no-call assertion against the disabled source's client) for `trending` / `newReleases` / `byGenre`.
- `recommendations/recommendations.service.spec.ts` — item-item CF (cosine on co-likes), `forUser` aggregation across recent likes, popularity ordering, all three cold-start fallbacks (insufficient likes → popularity → trending), 404 resolution. Uses a tagged-template `$queryRaw` stub that pattern-matches on the SQL text.
- `__shared-tests__/format.spec.ts` — `formatDuration`, `formatNumber`.

End-to-end specs live at the repo root in [`e2e/`](../../e2e/), driven by
[`playwright.config.ts`](../../playwright.config.ts). Run with `pnpm e2e`.

- [`e2e/smoke.spec.ts`](../../e2e/smoke.spec.ts) — golden-path guest flows
  against `DEMO_TRACKS` (no Postgres / no Jamendo key). Always runs.
- [`e2e/authed.spec.ts`](../../e2e/authed.spec.ts) — DB-backed authed
  flows (login → /library, like → "Liked songs", recordPlay → "Recently
  played"). Gated by `MELODIX_E2E_AUTHED=1` so it auto-skips when no
  Postgres is available; CI sets the flag and provisions Postgres via the
  workflow's `services:` block. ADR-0018.

Both servers are spawned by Playwright's `webServer` array — `pnpm --filter
@melodix/api start` (no `JAMENDO_CLIENT_ID`; `DATABASE_URL` + `JWT_SECRET`
are forwarded from the runner env when set) and `pnpm --filter @melodix/web
start` against `NEXT_PUBLIC_API_URL=http://localhost:4000`. CI runs the
suite via [`.github/workflows/e2e.yml`](../../.github/workflows/e2e.yml).
See ADR-0015.

## Theming

`apps/web` uses [`next-themes`](https://github.com/pacocoursey/next-themes)
with `attribute="class"`, `defaultTheme="dark"`, `enableSystem`. The
`ThemeProvider` lives at `apps/web/src/components/theme/ThemeProvider.tsx`
and wraps the entire app in `apps/web/src/app/layout.tsx`. The toggle
(`ThemeToggle`) is mounted in `TopBar`.

Light-theme styles are implemented as **scoped overrides** in
`apps/web/src/app/globals.css` under `.light ...` selectors, because the
codebase predates a theming system and uses a lot of raw `text-white`,
`bg-white/X`, and `bg-black/X` classes. Migrating each component to
semantic tokens (`text-fg`, `bg-surface/X`, …) is on the ROADMAP backlog.
See ADR-0009 for the rationale.

The Mini App still relies on `TelegramSync` (Telegram-supplied theme
parameters) and is **not** wired through `next-themes` — its container's
theme is dictated by the host Telegram client.

## Pre-commit

Husky 9 is set up via the root `prepare` script. The hook at
[`.husky/pre-commit`](../../.husky/pre-commit) runs `pnpm exec lint-staged`,
which currently formats staged source files with prettier (config in the root
`package.json`'s `lint-staged` field).

## Data flow (request lifecycle)

1. Browser hits `apps/web` (Next 15 App Router) — server component fetches via `lib/api.ts`.
2. `lib/api.ts` calls `${NEXT_PUBLIC_API_URL}/api/<route>`.
3. NestJS `apps/api` receives the request, routes to a controller, calls a service.
4. Service hits Prisma (Postgres) and/or `JamendoService` (Jamendo or `DEMO_TRACKS`).
5. Response is typed via `@melodix/shared` types — same shape consumed by both Next apps.
6. The Mini App follows the exact same flow with its own `lib/api.ts`.

## Conventions you must keep

- **No new HTTP framework.** All new server routes are NestJS controllers under `apps/api/src/<module>/`.
- **No new UI styling system.** Tailwind + framer-motion only.
- **No `any`.** If types are missing, add them to `packages/shared/src/types.ts` (or `apps/api/...` for API-internal).
- **Prefer additive Prisma migrations** — never edit a past migration.
- **Server components by default** in Next; reach for `'use client'` only when you need interactivity.
- **Use `API_ROUTES` constants** instead of hard-coding URLs in both Next apps.
