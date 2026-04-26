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

## ADR-0010 · "Recently played" stays client-side (localStorage) for now

**Date:** 2026-04-26
**Status:** accepted
**Context:** The Library page in #6 needs a "Recently played" section. A correct server-side implementation requires (a) a new Prisma model + migration, (b) write-on-play hooks in both player engines hitting an authenticated endpoint, and (c) reconciliation when the same user plays from multiple devices. Doing all of that inline would balloon the Library PR and delay the user-visible win.
**Decision:** Track the last ~30–50 played `Track` payloads in `localStorage` under `melodix.recentlyPlayed` (per-device, per-app surface). Both player engines call a tiny `pushRecentlyPlayed(track)` helper from inside their `playTrack` callback. The Library section subscribes to a `melodix:recently-played-changed` `CustomEvent` so the list refreshes without a poll. Scoping is per-device on purpose — multi-device sync is the H2 server-side history item (`PlayHistory` model), not this PR.
**Consequences:** Ships immediately, zero schema changes, works in private/incognito too (just doesn't persist). Cost: history doesn't follow the user across devices, and clearing browser storage wipes it. The H2 server-side `PlayHistory` will deprecate this helper or layer on top of it.

## ADR-0011 · Playlist reordering = up/down arrows, not drag-and-drop

**Date:** 2026-04-26
**Status:** accepted
**Context:** Reordering tracks inside a playlist is the most touch-sensitive interaction in the editor. We want it to work identically on web, mobile web, and inside the Telegram WebView. Adding `@dnd-kit/core` + `@dnd-kit/sortable` would solve the desktop case beautifully (~25 KB gzipped) but introduces a touch-DnD library inside Telegram WebView, which has well-known issues with native scroll competition.
**Decision:** Render a per-row up-arrow / down-arrow control on the web editor and persist on each click via `PATCH /playlists/:id/reorder`. The Mini App keeps the playlist read-only (edit sheet handles metadata only) — adding reorder there is deferred until we have a tested touch-DnD story.
**Consequences:** Zero new runtime deps; trivially testable; works for keyboard users out of the box. Cost: bulk reordering takes more clicks than a drag would. Migrating to DnD later is a single component swap because the reorder API already takes the full ordered list.

## ADR-0012 · Redis cache with graceful degradation when `REDIS_URL` is unset

**Date:** 2026-04-26
**Status:** accepted
**Context:** The Jamendo API is rate-limited and several of our endpoints
(`/api/tracks/{trending,new-releases,genre/:g}`, `/api/search`,
`/api/{albums,artists}/:id`) hit it on every cold visit. Redis is already in
`docker-compose.yml`. We want a real cache for self-hosted deployments
without breaking the "boots without keys" promise from `AGENTS.md` §3.
**Decision:** Add a `CacheService` ([`apps/api/src/cache/cache.service.ts`](../../apps/api/src/cache/cache.service.ts))
backed by `ioredis`. It exposes `get` / `set` / `wrap(key, ttl, loader)` /
`invalidate(prefix)`. When `REDIS_URL` is unset, or when the client cannot
connect, every method becomes a safe no-op — `get` returns `null`, `set` is
swallowed, and `wrap` always invokes the loader. `JamendoService` calls
`cache.wrap('jamendo:<method>:<args>', 600, loader)` around every idempotent
upstream call (TTL 10 min). `null` / `undefined` loader results are _not_
cached so a transient outage doesn't get pinned for 10 minutes.
**Consequences:** Self-hosted deployments with Redis get a ~10-min hot cache
with zero per-route boilerplate. Dev environments without Redis still work
identically — they just hit Jamendo every time. Cost: cache invalidation is
manual today; we'll add explicit `cache.invalidate('jamendo:')` admin
plumbing if/when we ship a "force refresh" UI.

## ADR-0013 · Three-bucket rate limiting via `@nestjs/throttler`

**Date:** 2026-04-26
**Status:** accepted
**Context:** The public API is unauthenticated for browsing endpoints and
`/auth/{login,register}` performs bcrypt rounds. A single global limit either
chokes legitimate browsing (when set low) or leaves auth wide open to
credential-stuffing (when set high). We want sane defaults that don't need
per-route babysitting.
**Decision:** Register three named buckets in `ThrottlerModule.forRoot([...])`
and bind `ThrottlerGuard` as a global `APP_GUARD`:

- **`short`** — 60 requests / 10 s. Burst protection on every endpoint.
- **`default`** — 300 requests / 60 s. Sustained baseline that comfortably
  covers a user opening Library + Discover + Search in quick succession.
- **`auth`** — declared _permissively_ (300 / 60 s) at the global level so it
  does not constrain general traffic. `AuthController` opts in via
  `@Throttle({ auth: { limit: 10, ttl: 60_000 } })` to bring the effective
  bucket down to 10 / 60 s — capping password attempts at one every six
  seconds per IP. Why two steps: `@nestjs/throttler` v6 evaluates _every_
  named bucket on every request, so a globally-tight `auth` bucket would
  also throttle `/tracks/trending` etc. The decorator scopes the tightening
  to auth routes.

`/api/health` is decorated with `@SkipThrottle()` so load-balancers and uptime
checkers never trip the limits.
**Consequences:** New endpoints inherit `short` + `default` for free.
Sensitive endpoints opt into `auth` with a one-line decorator. Cost: the
buckets are IP-only today (NestJS throttler default). If we put the API
behind a CDN that doesn't forward `X-Forwarded-For`, the entire CDN egress
will share one bucket — addressable by switching to a custom tracker that
keys on `req.user?.id ?? req.ip` once we have authenticated traffic.

## ADR-0014 — Server-side recently-played: `PlayHistory` model with cap and dedup

**Date:** 2026-04-26
**Status:** accepted
**Context:** Recently-played was localStorage-only (ADR-0010), which means it
disappears across devices and is invisible to any future server-side feature
(recommendations, smart shuffle, group listening). At the same time we don't
want `play()` to become a network-blocking operation, the table to grow
unbounded for power users, or a single replayed track to spam a hundred rows.
**Decision:** Introduce a `PlayHistory` Prisma model with `(userId, trackId,
playedAt)` and an `@@index([userId, playedAt])` that powers both the listing
query and the trim. Mount it under a fresh `HistoryModule` at
`/api/me/history` rather than overloading `UsersModule` — likes and history
have very different write shapes (idempotent toggle vs. high-volume append).
Three rules guard the server side:

1. **Cap at 200 rows per user.** On every insert, run a single
   `findFirst({ orderBy: { playedAt: 'desc' }, skip: 200 })` to identify the
   cutoff timestamp and `deleteMany({ playedAt: { lte: cutoff } })`. This
   stays O(1) on the cap rather than O(playback-minutes), and the table
   footprint scales linearly with active users.
2. **30-second same-track dedup.** A single track replayed back-to-back
   (the player's seek-to-zero / repeat pattern) only writes once. Different
   tracks immediately after each other are always recorded.
3. **`trackId` is a free string, not a FK on `Track`.** Tracks are persisted
   lazily (often never), and the play log must work for any Jamendo id the
   player decides to render. The same convention is already used for
   `Like.trackId` in practice.

Both player engines (`apps/web` + `apps/miniapp`) call `api.recordPlay(track.id)`
fire-and-forget alongside `pushRecentlyPlayed(track)`. The web client is
wrapped in `safe(...)` so a 401 (guest) or network failure never bubbles up
to playback. The Library page reads from the server when authed (and only
overwrites the localStorage view if the server returned a non-empty list, so
the user never sees their list flash empty during a race).

Read side (`GET /api/me/history?limit=N`) clamps `limit` to `[1, 100]`,
dedupes by `trackId` so two plays of the same song still produce one row,
and silently skips trackIds that no longer resolve via Jamendo (rather than
returning broken card slots).
**Consequences:** History is now cross-device for authed users and seeds the
data we'll need for recommendations / smart shuffle later. The 200-row cap
intentionally forgets old plays — if/when we want a richer "listening
stats" view we'll keep an aggregated rollup table instead of raising the
cap. Localstorage remains the source of truth for guests and as an instant
optimistic update; the two views converge after the first authed
`GET /api/me/history`.

## ADR-0015 — Playwright E2E: hermetic smoke against demo fixtures, no DB

**Date:** 2026-04-26
**Status:** accepted
**Context:** We needed a continuous safety net catching the kind of "click
play and nothing happens" regressions that unit tests can't see. Spinning
up Postgres + Jamendo creds in CI just for a smoke run is overkill — every
public read endpoint already supports two graceful degradations (`DEMO_TRACKS`
fallback when `JAMENDO_CLIENT_ID` is missing; PrismaService warns + boots
without a DB connection), and those code paths are themselves load-bearing.
Exercising them in CI is a feature, not a bug.
**Decision:** Adopt `@playwright/test` with one chromium project and a
`webServer` array that spawns the production builds of `apps/api` and
`apps/web` on ports 4000 / 3000. The API is started with `JAMENDO_CLIENT_ID=""`
and no `DATABASE_URL` (the values flow through Playwright's `env`), so
Jamendo calls fall through to demo fixtures and Prisma's `$connect` error
is swallowed by `PrismaService.onModuleInit`. The smoke suite covers three
stable, deterministic golden-path slices:

1. **Home renders sections + cards.** Asserts on the `Trending now` and
   `Fresh releases` headings and on the first track card (looked up by
   title fetched server-side from `/api/tracks/trending?limit=1`).
2. **Click → mini player.** Clicks the first card and asserts the global
   `PlayerBar` mounts (its primary toggle has aria-label `Play` or `Pause`)
   and shows the chosen title.
3. **Library guest CTA.** Visits `/library` while signed-out and confirms
   the "Sign in" button is rendered.

Authenticated flows (login, likes, server history) are intentionally **out
of scope for the first PR**. Adding them requires a Postgres service
container in CI and seeding a known user, which doubles the workflow
complexity. We'll add them once the harness has proven stable.

CI runs `.github/workflows/e2e.yml` in parallel with `ci.yml`. It caches
`~/.cache/ms-playwright` keyed on `pnpm-lock.yaml` so chromium is only
downloaded when the lockfile changes. The HTML report is uploaded on every
run (success or failure) for diff-by-eye, and `test-results/` traces are
uploaded only on failure.
**Consequences:** A new safety net catches whole-stack regressions — the
demo seed is small enough that flakiness from network jitter is impossible.
The trade-off is that the suite cannot catch real-Jamendo-only or DB-only
bugs; those should be covered by integration tests against a dedicated
staging environment in a future PR. Two carefully-chosen fallbacks
(no-key demo + no-DB Prisma) become semi-load-bearing for CI: if either
ever stops working as a graceful degradation, the e2e suite breaks loudly,
which is the right signal.
