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
packages/
  shared/       TypeScript domain types + API_ROUTES + helpers
  ui/           Reusable React components (cards, buttons, motion primitives)
docker-compose.yml    Postgres + Redis for local dev
turbo.json            Turborepo task graph
pnpm-workspace.yaml   Workspace globs
```

## `apps/api` — NestJS backend (port 4000, prefix `/api`)

Bootstrapped at [`apps/api/src/main.ts`](../../apps/api/src/main.ts). Module
graph at [`apps/api/src/app.module.ts`](../../apps/api/src/app.module.ts).

| Module             | Folder                 | Responsibility                                                    | Public routes                                                                                           |
| ------------------ | ---------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `AuthModule`       | `auth/`                | Register / login / Telegram `initData` verification, JWT issuance | `POST /api/auth/{register,login,telegram}`                                                              |
| `UsersModule`      | `users/`               | Current user, likes                                               | `GET /api/me`, `GET/POST/DELETE /api/me/likes/...`                                                      |
| `TracksModule`     | `tracks/`              | Trending, new releases, by-genre, by-id                           | `GET /api/tracks/{trending,new-releases,genre/:g,:id}`                                                  |
| `AlbumsModule`     | `albums/`              | List & fetch albums                                               | `GET /api/albums`, `GET /api/albums/:id`                                                                |
| `ArtistsModule`    | `artists/`             | List & fetch artists                                              | `GET /api/artists`, `GET /api/artists/:id`                                                              |
| `PlaylistsModule`  | `playlists/`           | Featured + CRUD + add/remove tracks                               | `GET /api/playlists/{featured,:id}`, `POST /api/playlists`, `POST/DELETE /api/playlists/:id/tracks/...` |
| `SearchModule`     | `search/`              | Unified search across tracks/albums/artists                       | `GET /api/search`                                                                                       |
| `JamendoModule`    | `jamendo/`             | HTTP client for Jamendo + `DEMO_TRACKS` fallback                  | (internal)                                                                                              |
| `PrismaModule`     | `prisma/`              | Prisma client singleton                                           | (internal)                                                                                              |
| `HealthController` | `health.controller.ts` | Liveness probe                                                    | `GET /api/health`                                                                                       |

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
  library/page.tsx    Auth-gated user library
  login/page.tsx      Login / register
  playlists/[id]/     Playlist detail + PlayPlaylistButton
src/components/
  hero/               Hero, OrbitingCovers, AudioVisualizer
  layout/             AppShell, Sidebar, MobileNav, TopBar
  player/             PlayerProvider, PlayerBar  ← global audio engine
  sections/           Section wrappers, TrackList, TrackGrid, PlaylistGrid, MoodPills
src/lib/
  api.ts              fetch helpers wrapping NEXT_PUBLIC_API_URL
  cn.ts               className helper
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
  discover/, search/, playlists/[id]/
src/components/
  PlayerProvider.tsx     leaner audio engine (no MediaSession-heavy bits)
  MiniPlayer.tsx         compact player UI
  MiniNav.tsx            bottom nav
  MiniTrackRow.tsx       single-line track row
  TelegramSync.tsx       reads window.Telegram.WebApp, expands viewport, syncs theme, triggers haptics
src/lib/
  api.ts                 same fetch wrapper, different base URL
  telegram.ts            typed wrapper around window.Telegram.WebApp
```

**Constraint.** Anything DOM-specific must be guarded with
`typeof window !== 'undefined'` — the Mini App SSR-renders inside a Telegram
WebView whose API surface is restricted.

## `packages/shared` — types & constants

- [`types.ts`](../../packages/shared/src/types.ts) — `Artist`, `Album`,
  `Track`, `Playlist`, `User`, `AuthResponse`, `PaginatedResponse`,
  `SearchResults`, `RepeatMode`, etc. **Edit here, not per-app.**
- [`constants.ts`](../../packages/shared/src/constants.ts) — `APP_NAME`,
  `GENRES`, `API_ROUTES`, `formatDuration`, `formatNumber`,
  `DEFAULT_PAGE_SIZE`, `MAX_QUEUE_SIZE`.

## `packages/ui` — shared React components

`AlbumCard`, `ArtistCard`, `TrackCard`, `PlaylistCard`, `GenrePill`,
`GradientButton`, `AudioWave`, `LikeButton`, `Marquee`, `Spinner`. Use these
before building yours from scratch.

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
