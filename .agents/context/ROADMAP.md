# ROADMAP.md — What's next

> Read this when: you're picking up a new task with no specific instructions,
> or you want to know whether something is already on the plan.
>
> **Update rule:** when you start an item, mark it `[~]`. When you ship it,
> change it to `[x]` here, flip the matching row in `FEATURES.md` to ✅, and
> append a 1-line entry to `PROGRESS.md`. If you discover a new idea, add it
> to **Backlog** below.

Statuses: `[ ]` not started · `[~]` in progress · `[x]` shipped · `[-]` dropped.

## H1 — Short-term (next ~2 weeks of focused work)

These finish the v0 → v1 polish so the product feels complete to first-time visitors.

- [ ] **Album & artist detail pages** — full track lists, "Play album" / "Play radio" buttons, biography section. _(see `FEATURES.md` row "Album / artist dedicated pages")_
- [ ] **Library page v1** — sections for "Your playlists", "Liked songs", "Recently played"; editable.
- [ ] **Playlist editor UI** — rename, reorder, set cover, toggle public/private. Backend exists, UI doesn't.
- [ ] **Skeleton loaders** for every list / grid (home, discover, search, library).
- [ ] **`prefers-reduced-motion` audit** — disable Hero animations & marquee scrolling when set.
- [ ] **Light-mode toggle on web** — match the Mini App's theme-sync flexibility.
- [ ] **First Jest test suite** — start with `apps/api/src/auth/auth.service.spec.ts` (password hashing, Telegram `initData` verification) and `packages/shared/src/__tests__/format.test.ts`.
- [ ] **Pre-commit hook** — `lint-staged` running prettier + `eslint --fix` on changed files; `husky` install in `pnpm install` lifecycle.

## H2 — Mid-term (next ~1–2 months)

- [ ] **Recently played history (server-side)** — new Prisma model `PlayHistory`, endpoint `GET /api/me/history`, write on each successful `play()`.
- [ ] **Follow artists** — Prisma model `Follow`, endpoints, UI on artist pages.
- [ ] **Redis-backed cache** for Jamendo responses (TTL ~10 min). Redis is already in `docker-compose.yml` but unused.
- [ ] **Rate limiting** on the public API (`@nestjs/throttler`).
- [ ] **OpenAPI / Swagger** at `/api/docs` (read-only in production).
- [ ] **Telegram bot deep-links** — share playlist as `t.me/<bot>?startapp=playlist_<id>`.
- [ ] **Lyrics view** — fetch from a free lyrics provider (e.g. lyrics.ovh), cache to Redis, render on Now-Playing.
- [ ] **Storybook** for `packages/ui` so motion components can be reviewed in isolation.
- [ ] **Playwright E2E** — at minimum: load home, search a term, play a track, like it, refresh and confirm it persists.

## H3 — Long-term / ambitious

- [ ] **Direct upload source** — let creators upload their own CC tracks. New `Track.source = 'upload'` path, S3-compatible storage, basic moderation.
- [ ] **Free-Music-Archive (FMA) source** — additional public catalog. Already enumerated in `Track.source`.
- [ ] **Server-side streaming proxy** with HTTP range support — better mobile data behaviour, gives us hooks for analytics & DRM-free transcoding.
- [ ] **Recommendations** — start with collaborative filtering on `Like` data; later swap for a content-based vector similarity over track metadata.
- [ ] **Group listening** in Telegram — sync playback across N members of a chat ("Listen Together" model).
- [ ] **Native mobile app** (React Native / Expo) — share `packages/shared` and `packages/ui` (where viable) with the web codebase.
- [ ] **Offline mode (PWA)** — install prompt, service worker, cached track list & "downloaded" CC tracks.
- [ ] **Internationalisation** — `next-intl`, start with `en` + `vi` (project author is Vietnamese-speaking; UX copy is currently English-only).

## Cross-cutting / quality bar

- [ ] **Lighthouse Performance ≥ 90** on `/` (web).
- [ ] **A11y pass** — focus rings, ARIA roles on player controls, keyboard navigation parity with mouse.
- [ ] **Bundle audit** — keep first-load JS on `/` under 200 KB gzipped.
- [ ] **Sentry / OpenTelemetry** — error + perf telemetry across api/web/miniapp.
- [ ] **Docker images** for `apps/api` and `apps/web` (multi-stage, non-root user) + `docker-compose.prod.yml` example.
- [ ] **CONTRIBUTING.md** — onboard external contributors.

## Backlog (unsized ideas — promote into H1/H2/H3 when picked up)

- Smart shuffle (avoid recently played, weight by likes).
- "Daily mix" auto-playlists per genre.
- Crossfade / gapless playback.
- Equalizer presets (Web Audio API).
- Embeddable player widget (`<iframe src="/embed/track/:id">`).
- Public RSS feed for new releases.
- Color-extracted album-cover gradients (LCH-based, à la Apple Music).
- Account deletion / GDPR export flow.
