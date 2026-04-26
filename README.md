# Melodix

> A modern, motion-rich music streaming experience — for the web and inside Telegram.

Melodix is a full-stack monorepo: a NestJS API that brokers Creative-Commons music from the
[Jamendo](https://devportal.jamendo.com) catalog, a Next.js 15 web app with a deeply animated
interface inspired by Spotify, Zing MP3, and motion-design references like
[motionsites.ai](https://motionsites.ai/), and a Telegram Mini App that mirrors the same library
inside any Telegram chat.

```
melodix/
├── apps/
│   ├── api/         # NestJS + Prisma + PostgreSQL + Jamendo proxy
│   ├── web/         # Next.js 15 — main website with motion design
│   └── miniapp/     # Next.js — Telegram Mini App (theme-synced)
├── packages/
│   ├── shared/      # Shared TypeScript types, constants, helpers
│   └── ui/          # Shared React components (cards, buttons, motion primitives)
├── docker-compose.yml   # Postgres + Redis for local dev
└── turbo.json
```

## Highlights

- **Beautifully fluid UI** — aurora gradients, orbiting album covers, scrubbable progress
  with shimmer, animated audio visualizers, and motion-tuned hover states throughout.
- **One audio engine, two surfaces** — a Web `PlayerProvider` and a leaner Mini App version,
  each with global controls, queue/history, shuffle/repeat, MediaSession integration, and
  keyboard shortcuts.
- **Telegram-native Mini App** — auto-detects `Telegram.WebApp`, expands the viewport,
  triggers haptic feedback, and authenticates the user via signed `initData`.
- **Jamendo-powered, demo-safe** — the API gracefully falls back to a curated set of
  bundled demo tracks (using royalty-free SoundHelix audio) when no API key is present, so
  the app boots cleanly out of the box.
- **Type-safe end-to-end** — `@melodix/shared` types are reused by both Next.js apps and the
  NestJS service.

## Quickstart

### 1. Prerequisites

- Node 20+
- pnpm 9+
- Docker (for the local Postgres + Redis stack)

### 2. Install

```bash
pnpm install
```

### 3. Start infra (optional, only needed for auth/playlists/likes)

```bash
docker compose up -d
cp apps/api/.env.example apps/api/.env
pnpm --filter @melodix/api prisma:generate
pnpm --filter @melodix/api prisma:migrate
pnpm --filter @melodix/api prisma:seed
```

### 4. Run all apps in dev

```bash
pnpm dev
```

- Web: http://localhost:3000
- Mini App: http://localhost:3001
- API: http://localhost:4000/api

### 5. (Optional) Use the live Jamendo catalog

Register a free client at [devportal.jamendo.com](https://devportal.jamendo.com) and add
the client ID to `apps/api/.env`:

```
JAMENDO_CLIENT_ID=your-id-here
```

When unset, Melodix transparently serves a curated 36-track demo library so you can browse,
play, and test all flows without any external dependency.

## Telegram Mini App

1. Create a bot via [@BotFather](https://t.me/BotFather) and grab the token.
2. Set `TELEGRAM_BOT_TOKEN` in `apps/api/.env` so the API can verify `initData` per the
   [official spec](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app).
3. Deploy the Mini App somewhere HTTPS-reachable (Vercel, Cloudflare Pages, etc.).
4. In BotFather, set the `Web App URL` for the bot to the Mini App URL.

## Scripts

| Command                                     | What it does                        |
| ------------------------------------------- | ----------------------------------- |
| `pnpm dev`                                  | Run web + miniapp + api in parallel |
| `pnpm build`                                | Build everything                    |
| `pnpm typecheck`                            | Type-check every package            |
| `pnpm lint`                                 | Lint every package                  |
| `pnpm --filter @melodix/api prisma:migrate` | Apply migrations                    |
| `pnpm --filter @melodix/api prisma:seed`    | Seed the demo user                  |

## Tech stack

- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS, Framer Motion, lucide-react
- **Backend:** NestJS 10, Prisma 6, PostgreSQL, JWT auth (passport)
- **Music:** Jamendo Creative-Commons API (with bundled demo fallback)
- **Build system:** pnpm workspaces + Turborepo

## For AI agents (and humans onboarding fast)

Melodix ships an opinionated, token-efficient context system so that any AI
agent (Devin, Claude Code, Cursor, Codex, …) — or a new human contributor —
can reach productive work after reading at most 1–3 small files.

Start at **[`AGENTS.md`](AGENTS.md)**. It routes you to the right deep-dive:

| Where                                                                              | What's in there                                                               |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [`AGENTS.md`](AGENTS.md)                                                           | 30-second TL;DR + a routing table from "I want to do X" to "read these files" |
| [`.agents/context/PROJECT.md`](.agents/context/PROJECT.md)                         | Vision, audience, success criteria                                            |
| [`.agents/context/ARCHITECTURE.md`](.agents/context/ARCHITECTURE.md)               | Module map across api / web / miniapp / shared / ui                           |
| [`.agents/context/FEATURES.md`](.agents/context/FEATURES.md)                       | Live catalog of features with status (✅ / 🟡 / 🔵)                           |
| [`.agents/context/ROADMAP.md`](.agents/context/ROADMAP.md)                         | Short / mid / long-term feature plan                                          |
| [`.agents/context/PROGRESS.md`](.agents/context/PROGRESS.md)                       | Running changelog of what's been built                                        |
| [`.agents/context/STACK.md`](.agents/context/STACK.md)                             | Versions, ports, env vars, scripts                                            |
| [`.agents/context/GLOSSARY.md`](.agents/context/GLOSSARY.md)                       | Domain terms                                                                  |
| [`.agents/context/DECISIONS.md`](.agents/context/DECISIONS.md)                     | Architectural Decision Records (ADRs)                                         |
| [`.agents/skills/update-context/SKILL.md`](.agents/skills/update-context/SKILL.md) | Step-by-step: how to keep the above files fresh on every PR                   |

Every PR that changes code is required to update the relevant context files in
the same commit-set. The PR template enforces this with a checklist, and the
`AI Context Freshness` GitHub Action posts a warning if a code change lands
without a context update.

## License

MIT — see `LICENSE`. Music streamed via Jamendo retains its original Creative-Commons
license; respect attribution requirements when redistributing.
