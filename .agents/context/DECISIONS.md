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

## ADR-0016 — Follow artists: free-string `artistId` + composite PK

**Date:** 2026-04-26
**Status:** accepted
**Context:** Adding "Follow artists" requires a join table between `User` and
artists. Two competing models:

1. **FK to a local `Artist` row** — clean schema, but `Artist` rows are only
   persisted lazily (the API hydrates them on demand via Jamendo and never
   does a full sync). A `FOREIGN KEY` constraint would fail any time a user
   tries to follow an artist whose row hasn't been materialized yet, which
   is the common case.
2. **Free-string `artistId`** — same shape as `Like.trackId` and
   `PlayHistory.trackId`: `userId` + `artistId` (typically `jm_<jamendoId>`)
   with no FK on the artist side, and a composite primary key
   `[userId, artistId]` so duplicates are impossible at the DB level.

**Decision:** Adopt option 2. The `Follow` model has `userId`, `artistId`,
`createdAt`, `@@id([userId, artistId])`, and `@@index([userId, createdAt])`
for the most common query (newest-first list per user). Cascade delete on
`User`. No FK on the artist side.

The `FollowsService` mirrors the existing `UsersService.like` shape:
`upsert` for follow (idempotent), `deleteMany` for unfollow (no-op if the
row doesn't exist), and `findMany` then per-row Jamendo hydration for
list. A separate `GET /api/me/follows/ids` endpoint returns just the
artist-ID strings so the FE can decide "is this artist already followed?"
in one round-trip without paying the hydration cost.

**Consequences:**

- **Pros.** Works today, end to end, with zero seed data. Same precedent as
  `Like` and `PlayHistory`. Composite PK guarantees no duplicate follow
  rows. Fast lookups via the `[userId, createdAt]` index.
- **Cons.** Same orphan risk as `Like` / `PlayHistory`: if Jamendo retires
  an artist, `getArtistById` returns `null` and the row silently disappears
  from the list view. The row stays in the DB but is invisible. We accept
  this — it's identical to the existing pattern and a future migration to
  a real `Artist` cache table can backfill cleanly.
- **Future direction.** Once we add a periodic Artist materialization job
  (and cache hydration via Redis), we can switch to option 1 with a
  single migration: add an `Artist` row for every distinct `Follow.artistId`,
  then add the FK. The composite PK survives that migration unchanged.

---

## ADR-0017 — `lyrics.ovh` proxy with negative caching

**Date:** 2026-04-26
**Status:** Accepted (#11)

**Context.** "Lyrics view" was the next high-leverage user-facing feature on the H2 list, but lyrics rights are
notoriously fragmented. Major catalogs (Genius, Musixmatch) require API keys
and have strict request quotas. We don't want to add a credentialed
dependency to the boot path — Melodix's whole demo-mode contract
(`AGENTS.md` §3) is "must keep working when external keys are unset". We
also don't want every play to hit a third-party provider directly from
the browser because of CORS, rate limits, and the inability to cache
across users.

**Options considered:**

1. **Genius** — best metadata + the lyric strings, but requires API token
   and the lyrics themselves are scraped from HTML; legally murky.
2. **Musixmatch** — official; free tier is too small (~2k req/day) to
   cover even a small launch, and per-track snippets only.
3. **lyrics.ovh** — free, no auth, simple `GET /v1/{artist}/{title}`
   contract returning `{ lyrics }`. Public CC dataset; quality varies but
   coverage is decent for the long-tail Creative-Commons catalog Jamendo
   exposes. Not suitable for hot-major-label tracks, which we don't carry
   anyway.

**Decision.** Use `lyrics.ovh` behind a NestJS proxy module. The browser
hits our API (`GET /api/lyrics?artist=…&title=…`); we forward to
`lyrics.ovh`, normalize the response to `{ artist, title, lyrics, source }`,
and cache it in Redis. Cache TTL is **24 h on a hit** (lyrics rarely
change) and **1 h on a miss** — negative caching keeps us from spamming
the upstream while still letting newly-indexed tracks re-resolve within
an hour.

The endpoint is public (lyrics aren't user-scoped), but throttled at
120 req/min via `@Throttle` so a single bad actor can't drain the
upstream. Empty inputs short-circuit without touching cache or fetch. A
4 s timeout on the upstream fetch + try/catch around the response means
a flaky provider never blocks playback — the UI just shows
"Couldn't load lyrics".

The web UI gets a `LyricsDrawer` (right-side slide-over with a `Mic2`
icon trigger in `PlayerBar`); the Mini App gets a `LyricsSheet` (bottom
sheet from `MiniPlayer`). Both fetch lazily on open and rebuild on track
change with a `cancelled` flag so stale resolutions don't overwrite the
current track.

**Consequences:**

- **Pros.** Zero new credentials, zero added env vars, zero added boot
  dependencies. Cache amortizes upstream traffic; demo mode still works
  (no provider call when artist+title are missing). The contract is
  simple enough to swap out later without UI changes — replace the
  service body with Genius/Musixmatch and the FE keeps working.
- **Cons.** Coverage is patchy on the long-tail Jamendo catalog; many
  tracks will simply show "No lyrics available". This is acceptable
  because the value is "lyrics when present", not "lyrics for everything".
- **Future direction.** When we add direct upload (#H3), tracks will have
  user-supplied lyric metadata that takes precedence over the upstream.
  At that point this ADR remains correct: lyrics.ovh stays as the
  fallback, and the cache key gains a source-prefix.

## ADR-0018 — Authed Playwright E2E: provision Postgres in CI, gate locally

**Date:** 2026-04-26 · **Status:** Accepted · \*\*Supersedes part of ADR-0015

ADR-0015 established a hermetic E2E suite that booted the API without
`DATABASE_URL` so the runner needed no Postgres. That covered guest
flows (home, search, library CTA) but explicitly deferred login / likes
/ server-history coverage. We need that coverage now to catch
regressions on the auth-gated surfaces before they hit production.

**Decision.**

CI now stands up a dedicated `postgres:16-alpine` service container
inside `.github/workflows/e2e.yml` and feeds the API a real
`DATABASE_URL`. Schema is materialised with `prisma db push
--accept-data-loss --skip-generate` (we don't ship migration history;
the schema is the source of truth) and the existing `prisma:seed` script
provisions the test fixture user (`demo` / `melodix123`).

`playwright.config.ts` forwards `DATABASE_URL` and `JWT_SECRET` to the
API webServer **only when the runner exports them**. Locally those vars
are usually unset, so the smoke specs continue to run hermetically with
zero developer setup.

The new authed specs in [`e2e/authed.spec.ts`](../../e2e/authed.spec.ts)
gate themselves on `MELODIX_E2E_AUTHED=1`, which CI sets unconditionally
and developers opt into when they have docker-compose Postgres up.
That keeps `pnpm e2e` green on a fresh laptop.

**Schema clean-up shipped alongside.** While wiring this up we found a
latent 500 on `POST /api/me/likes/:trackId`: `Like.trackId` was a FK to
`Track.id`, but tracks aren't persisted (Jamendo + DEMO_TRACKS are
ephemeral), so liking anything from /trending blew up. Dropped the FK
and made `Like.trackId` a free string, mirroring `PlayHistory` (ADR-0014)
and `Follow` (ADR-0016). No data migration needed since the table
shipped empty in #6 and never gained production rows.

**Consequences:**

- **Pros.** Real coverage of login → /library, like → "Liked songs",
  recordPlay → "Recently played" — all three were untested before. The
  Postgres service container adds ~10 s of CI wall-time but exercises
  the same Prisma + bcrypt code path users hit. No new mock layers.
- **Cons.** The E2E job is no longer fully hermetic — a flake in the
  Postgres image rollout would block CI. Mitigated by pinning to
  `postgres:16-alpine` and using GH Actions' built-in healthcheck retry.
- **Why not Testcontainers / a fresh DB per test?** Overkill for a
  3-spec authed surface; the seed user is the only persistent state and
  cross-spec isolation comes from `userId`-scoped queries. Revisit if
  the authed suite grows past ~20 specs or starts mutating shared rows.
- **Why not a separate GH Actions matrix entry instead of one job?**
  The smoke specs share the same playwright install + browser cache,
  and splitting them would double the cache miss surface. Single job,
  single browser install, two spec files.

## ADR-0019 · Docker Compose self-host with Cloudflare Tunnel

**Date:** 2026-04-26
**Status:** accepted
**Context:** The project lacked any production deployment story. Self-hosting via Docker Compose with Cloudflare Tunnel is the simplest path — no cloud provider lock-in, no Kubernetes complexity, zero open ports on the host.
**Decision:** Add per-app multi-stage Dockerfiles (`apps/{api,web,miniapp}/Dockerfile`) producing slim `node:22-alpine` images. `docker-compose.yml` orchestrates `postgres`, `redis`, `api`, `web`, `miniapp`, and a `cloudflare/cloudflared` sidecar that exposes all services via a single tunnel token. Next.js apps use `output: 'standalone'` for minimal image size. `NEXT_PUBLIC_API_URL` is injected at build time via Docker build args. `.env.production.example` documents all required and optional vars. Database and Redis can be swapped for cloud providers (Supabase, Neon, Upstash, etc.) by changing the URL and removing the local container.
**Consequences:** One-command deploy (`docker compose --env-file .env.production up -d --build`). No ports exposed to the internet — Cloudflare handles TLS and DDoS protection. Cost: the `NEXT_PUBLIC_API_URL` is baked at build time, so changing the API domain requires a rebuild of the web/miniapp images. The `output: 'standalone'` setting is now always on, which changes the Next.js build output structure (adds `.next/standalone/`).

## ADR-0020 · Admin system with separate auth and Cloudflare R2 storage

**Date:** 2026-04-26
**Status:** accepted
**Context:** The project needs an admin panel to upload AI-generated music and toggle music sources (Jamendo on/off). Admin auth must be separate from user auth to prevent privilege escalation.
**Decision:** Add `AdminUser` Prisma model (separate from `User`), `AdminAuthModule` with its own Passport strategy (`admin-jwt`) that validates an `isAdmin: true` claim. Upload storage uses Cloudflare R2 via the S3-compatible `@aws-sdk/client-s3` SDK. `MusicSource` table tracks enabled/disabled state per source, checked at query time by `TracksService` and `SearchService`. Uploaded tracks reuse the existing `Track`/`Artist` models with `source: 'upload'`.
**Consequences:** Admin tokens are interchangeable with user tokens at the JWT level (same secret) but carry an `isAdmin` flag validated by `AdminGuard`. R2 requires 4 new env vars (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL`). Toggling a source off removes its tracks from all browse/search results without deleting data.

## ADR-0021 · Admin dashboard as a separate Next.js app on port 3002

**Date:** 2026-04-27
**Status:** accepted
**Context:** Phase 1 (#19, #20) shipped the admin API surface (`/api/admin/*`)
behind a separate `admin-jwt` strategy with a one-time `/setup` flow. We need
a UI for it that supports auth, track CRUD, single + bulk upload, and source
toggling. Three options were considered: (a) embed admin pages inside
`apps/web` behind a route group, (b) add a `/admin` route group inside
`apps/miniapp`, or (c) ship a third Next.js app at `apps/admin/`.
**Decision:** Option (c). The admin app lives at `apps/admin` on port 3002
with its own Dockerfile and docker-compose service, follows the same
`@melodix/shared` + `@melodix/ui` workspace pattern as `web`/`miniapp`, and
talks to the existing `/api/admin/*` endpoints with no API changes. Admin
JWT is stored under a **distinct** localStorage key (`melodix.admin.token`)
so the public app's `melodix.token` is never coerced into admin context. The
`/login` route doubles as first-time setup — if `POST /api/admin/auth/setup`
returns `403`, the form auto-flips to login mode (the `Serializable`
transaction added in #20 makes the race-free). Authenticated pages live
under a `(dashboard)` route group whose layout wraps `<RequireAdmin>` (a
client gate that reads the JWT payload and redirects to `/login?next=...`).
**Consequences.**

- **Pros.** Clear blast-radius isolation: admin code can never accidentally
  surface in the public bundle, and the admin token can't be lifted by web
  user-JS that scans `melodix.token`. Future admin-only deps (analytics
  dashboards, large editors) won't bloat the public-app bundle. Bulk upload
  can use Browser-only APIs (`crypto.randomUUID`, `URL.createObjectURL`)
  without DOM-guarding for the Mini App's WebView. Deployable behind its
  own Cloudflare hostname (`admin.<domain>`) for an extra access-control
  boundary.
- **Cons.** Three extra files duplicated from `apps/web`'s scaffold
  (`tsconfig`, `next.config.mjs`, `tailwind.config.ts`, eslint config),
  one more Docker stage to keep aligned, and one more port to remember.
  Mitigated by copying the existing `apps/web` config verbatim — when web
  bumps Next.js, admin bumps the same way.
- **Why not embed in `apps/web`?** Would couple admin shipping cadence to
  the public app's, leak admin chunk paths into the public route manifest,
  and force every Mini App / public-web reviewer to also reason about admin
  flows. Not worth the saved scaffolding.
- **Why not a server-action-backed admin route group?** The Phase-1 API is
  already well-typed and tested; rewriting it as Next.js server actions
  would duplicate validation logic and lose the Mini App / future CLI
  reuse path.
