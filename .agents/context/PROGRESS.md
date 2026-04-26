# PROGRESS.md — Running log of completed work

> Read this when: you want to know "what changed recently?" without scanning
> git log. This file is the project's **changelog as the AI sees it** — every
> non-trivial PR appends an entry.
>
> **Update rule:** add a single line per PR, newest first, format:
> `YYYY-MM-DD · #<pr> · <one-line summary>`. If the PR also changes
> `FEATURES.md` / `ROADMAP.md` / `ARCHITECTURE.md`, mention which.

## 2026

### April

- 2026-04-26 · _(this PR)_ · Redis cache for Jamendo (TTL 10 min) + rate limiting via `@nestjs/throttler`. New `CacheService` (ioredis, gracefully no-ops when `REDIS_URL` unset) wraps every idempotent Jamendo call (`trending`, `new-releases`, `genre`, `search-{tracks,albums,artists}`, `track`, `album`, `artist`, `album-tracks`, `artist-tracks`). `ThrottlerModule` registers `short`/`default`/`auth` buckets bound globally; `/auth/*` opts into `auth` bucket; `/api/health` is `@SkipThrottle`. 8 new tests (38/38 total). FEATURES/ROADMAP/ARCHITECTURE/STACK/DECISIONS updated; ADR-0012 + ADR-0013 added.
- 2026-04-26 · #6 · Library v1 + playlist editor: web `/library` and Mini App `/library` show 3 sections (your playlists / liked songs / recently played); owner-only `EditPlaylistDialog` (rename / cover / public-private / delete) with reorder + remove on web, slim `PlaylistEditSheet` on Mini App. Backend gains `PATCH /playlists/:id`, `PATCH /playlists/:id/reorder`, `DELETE /playlists/:id` (12 new tests). Recently-played tracked client-side in `localStorage` (server-side moved to H2). FEATURES/ROADMAP/ARCHITECTURE/DECISIONS updated; ADR-0010 added.
- 2026-04-26 · #5 · Light-mode toggle on web — `next-themes` provider, `ThemeToggle` Sun/Moon in TopBar, `.light` overrides for the dark-baseline utility classes in `globals.css`. Closes the last H1 item. FEATURES/ROADMAP/STACK/ARCHITECTURE/DECISIONS updated.
- 2026-04-26 · #4 · H1 bundle: album & artist detail pages (web + Mini App), shared `Skeleton`/`TrackSkeletonRow`/`CardSkeletonGrid`/`HeaderSkeleton` + per-route `loading.tsx`, `prefers-reduced-motion` audit (global CSS rule + framer-motion `MotionConfig`), husky 9 + lint-staged pre-commit hook, first Jest tests for `AuthService` and shared formatters.
- 2026-04-26 · #3 · Added the AI-context system: `AGENTS.md` entry point, `.agents/context/` files (PROJECT, ARCHITECTURE, FEATURES, ROADMAP, PROGRESS, STACK, GLOSSARY, DECISIONS), `.agents/skills/update-context/SKILL.md` to enforce updates, freshness CI workflow, and PR-template checklist. Also seeded `ROADMAP.md` with proposed H1/H2/H3 features.
- 2026-04-26 · #1 · Initial scaffold for the Melodix monorepo (apps: api/web/miniapp; packages: shared/ui; CI; demo data; player engines).

---

> Add new entries above this line. Keep each entry to one line. If you need
> more space, link to the PR description.
