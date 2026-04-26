# GLOSSARY.md — Domain terms

> Read this when: a name in the code is opaque to you. Add a row here when you
> introduce a new domain term that won't be obvious from its identifier.

| Term                        | Meaning                                                                                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Web**                     | The main Next.js site at `apps/web`. Runs on port 3000. The "full" Melodix experience.                                                                                                |
| **Mini App**                | The Telegram Mini App at `apps/miniapp`. Runs on port 3001 in dev. Slimmer twin of Web, hosted inside Telegram WebView.                                                               |
| **API**                     | The NestJS backend at `apps/api`. Always served under the `/api` prefix on port 4000.                                                                                                 |
| **Source** (`Track.source`) | Where a track originated: `'jamendo' \| 'demo' \| 'fma' \| 'upload'`. Demo is the bundled fallback used when no `JAMENDO_CLIENT_ID` is set.                                           |
| **Demo mode**               | The whole-app behaviour when no `JAMENDO_CLIENT_ID` is present: `JamendoService` returns `DEMO_TRACKS` (36 curated SoundHelix tracks) so all flows work offline.                      |
| **Catalog**                 | The set of `Track` / `Album` / `Artist` records the user can browse. Today: Jamendo + demo.                                                                                           |
| **Queue**                   | Upcoming tracks the player will play next. Lives in `PlayerProvider` state. Capped at `MAX_QUEUE_SIZE = 200`.                                                                         |
| **History**                 | Tracks the player has already played in this session. Used for "previous" and shuffle's "all loop" mode. Client-only today.                                                           |
| **Repeat mode**             | One of `'off' \| 'all' \| 'one'`, see `RepeatMode` in `packages/shared/src/types.ts`.                                                                                                 |
| **PlayerProvider**          | React context + `<audio>` ref managing all playback. There are _two implementations_ — a richer one in `apps/web` and a leaner one in `apps/miniapp`.                                 |
| **`initData`**              | The signed payload Telegram sends to a Mini App identifying the current user. We verify it server-side per Telegram's spec to issue our own JWT. See `auth.service.ts:telegramLogin`. |
| **Featured playlists**      | Editorial picks rendered on the home page. Currently fetched from the DB via `GET /api/playlists/featured`.                                                                           |
| **Aurora gradient**         | The sweeping multi-stop background gradient used on the home Hero. Implemented with framer-motion in `apps/web/src/components/hero/Hero.tsx`.                                         |
| **`@melodix/shared`**       | Workspace package that owns all cross-app TS types and constants. Single source of truth — duplicating types per app is a style violation.                                            |
| **`@melodix/ui`**           | Workspace package of reusable React components (cards, buttons, motion primitives). Both Next apps consume it.                                                                        |
| **AGENTS / context system** | The set of files under `AGENTS.md` + `.agents/context/` designed to make this repo cheap to read for AI agents. Updating them on every PR is mandatory.                               |
