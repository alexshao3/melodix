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

- [x] **Album & artist detail pages** — full track lists, hero header, Play album / Play top tracks button, biography section. Web at `/albums/[id]` & `/artists/[id]`; Mini App equivalents in `apps/miniapp/src/app/`. _(shipped in #4)_
- [x] **Library page v1** — web `/library` and Mini App `/library` show 3 sections (your playlists / liked songs / recently played) with sign-in CTA when logged out. _(shipped in #6)_
- [x] **Playlist editor UI** — owner-only Edit dialog (rename / cover URL / public-private / delete) plus per-row reorder + remove on web; slim bottom-sheet equivalent in the Mini App. Backed by new `PATCH /playlists/:id`, `PATCH /playlists/:id/reorder`, `DELETE /playlists/:id` endpoints. _(shipped in #6; ADR-0010 documents the localStorage "recently played".)_
- [x] **Skeleton loaders** — `Skeleton`, `TrackSkeletonRow`, `CardSkeletonGrid`, `HeaderSkeleton` exported from `@melodix/ui`; per-route `loading.tsx` files for home, discover, library, album/artist/playlist details. _(shipped in #4)_
- [x] **`prefers-reduced-motion` audit** — global CSS rule in `app/globals.css` collapses CSS animations & transitions; `MotionRoot` wraps both apps in `MotionConfig reducedMotion="user"` so framer-motion respects it too. _(shipped in #4)_
- [x] **Light-mode toggle on web** — `next-themes` (`attribute="class"`, default `dark`); `ThemeProvider` wraps the layout, `ThemeToggle` (Sun/Moon) sits in the TopBar; light overrides live in `apps/web/src/app/globals.css` under `.light` selectors. _(closes H1; ADR-0009 documents the override approach.)_
- [x] **First Jest test suite** — `apps/api/src/auth/auth.service.spec.ts` (12 tests covering password register/login + Telegram `initData` verification + `telegramLogin` upsert) and `apps/api/src/__shared-tests__/format.spec.ts` (6 tests covering `formatDuration` + `formatNumber`). Jest runs on real bcrypt, no mocks of crypto. _(shipped in #4)_
- [x] **Pre-commit hook** — `husky@9` configured via `prepare` script; `.husky/pre-commit` runs `pnpm exec lint-staged`; `lint-staged` config in root `package.json` runs prettier on staged source files. ESLint integration is a follow-up. _(shipped in #4)_

## H2 — Mid-term (next ~1–2 months)

- [x] **Recently played history (server-side)** — `PlayHistory` Prisma model + `GET/POST/DELETE /api/me/history`; both player engines mirror plays to the server when authed; Library pages prefer server history when authed and fall back to localStorage for guests. Cap 200 rows/user, 30s same-track dedup. _(shipped in #8; ADR-0014)_
- [x] **Follow artists** — `Follow` Prisma model (composite PK `[userId, artistId]`, free-string artistId), `GET/POST/DELETE /api/me/follows` + `GET /api/me/follows/ids`. New `FollowButton` on the artist detail page (optimistic toggle, sign-in CTA for guests on web; auto-authed in Mini App) plus a "Following" section on `/library` for both surfaces. _(shipped in #10; ADR-0016)_
- [x] **Redis-backed cache** for Jamendo responses (TTL 10 min) — shipped in #7. `apps/api/src/cache/` + `cache.wrap()` around every idempotent Jamendo call. Gracefully no-ops when `REDIS_URL` is unset.
- [x] **Rate limiting** on the public API (`@nestjs/throttler`) — shipped in #7. Three buckets: `short` (60/10s burst), `default` (300/60s sustained), `auth` (10/60s for `/auth/*`). `/api/health` is `@SkipThrottle`. ADR-0013.
- [ ] **OpenAPI / Swagger** at `/api/docs` (read-only in production).
- [ ] **Telegram bot deep-links** — share playlist as `t.me/<bot>?startapp=playlist_<id>`.
- [x] **Lyrics view** — `GET /api/lyrics?artist&title` proxies `lyrics.ovh`; Redis-cached 24h hit / 1h miss; web drawer + Mini App bottom sheet from the player. (Shipped in #11, ADR-0017)
- [ ] **Storybook** for `packages/ui` so motion components can be reviewed in isolation.
- [x] **Playwright E2E (smoke + authed)** — smoke harness shipped in #9 (home → click track → mini player, search route, library guest sign-in CTA, `DEMO_TRACKS` fixtures, no Postgres needed). Authed harness shipped in _(this PR)_ (#13): CI now stands up a Postgres service, `prisma db push` + `prisma:seed` provision a `demo`/`melodix123` user, and `e2e/authed.spec.ts` exercises login → /library, like → "Liked songs" section, recordPlay → "Recently played" section. Locally gated by `MELODIX_E2E_AUTHED=1`. ADR-0015 + ADR-0018.

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
- [x] **Docker images** for `apps/api`, `apps/web`, and `apps/miniapp` (multi-stage, non-root user) + `docker-compose.yml` with Cloudflare Tunnel. _(shipped in this PR; ADR-0019)_
- [ ] **CONTRIBUTING.md** — onboard external contributors.

## Backlog (unsized ideas — promote into H1/H2/H3 when picked up)

- Add `eslint --fix` to the `lint-staged` chain (currently prettier-only).
- Wire artist links from track rows (`TrackCard` row variant → `/artists/:id`).
- Album list from artist page (Mini App + web).
- Surface artist/album cards in Mini App search (currently shows tracks only).
- Migrate hardcoded `text-white` / `bg-white/X` / `bg-black/X` classes to semantic Tailwind tokens (`text-fg`, `bg-surface/X`, …) so the light-mode override block in `globals.css` can shrink.

- Smart shuffle (avoid recently played, weight by likes).
- "Daily mix" auto-playlists per genre.
- Crossfade / gapless playback.
- Equalizer presets (Web Audio API).
- Embeddable player widget (`<iframe src="/embed/track/:id">`).
- Public RSS feed for new releases.
- Color-extracted album-cover gradients (LCH-based, à la Apple Music).
- Account deletion / GDPR export flow.
