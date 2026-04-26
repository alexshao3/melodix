# STACK.md — Versions, ports, env vars, scripts

> Read this when: you need exact versions or you're configuring a new
> environment. Bump these together with `package.json` / config files in the
> same PR — never separately.

## Languages & runtimes

|            | Version              | Source of truth                                            |
| ---------- | -------------------- | ---------------------------------------------------------- |
| Node.js    | ≥ 20 (CI uses 22)    | `package.json#engines.node`, `.github/workflows/ci.yml`    |
| pnpm       | ≥ 9 (CI uses 9.15.1) | `package.json#engines.pnpm`, `package.json#packageManager` |
| TypeScript | ^5.7.2               | root `package.json` + each app's `package.json`            |

## Build & tooling

|                      | Version  |
| -------------------- | -------- |
| Turborepo            | ^2.3.3   |
| Prettier             | ^3.3.3   |
| ESLint (web/miniapp) | ^9.17.0  |
| ESLint (api)         | ^8.57.1  |
| Tailwind CSS         | ^3.4.17  |
| PostCSS              | ^8.4.49  |
| autoprefixer         | ^10.4.20 |

## Frontend

|                   | Version  |
| ----------------- | -------- |
| Next.js           | ^15.1.3  |
| React / React-DOM | ^19.0.0  |
| framer-motion     | ^11.15.0 |
| zustand (web)     | ^5.0.2   |
| lucide-react      | ^0.469.0 |
| clsx              | ^2.1.1   |
| tailwind-merge    | ^2.5.5   |

## Backend

|                                                                       | Version      |
| --------------------------------------------------------------------- | ------------ |
| NestJS (`@nestjs/{common,core,platform-express,config,jwt,passport}`) | ^10.x        |
| Prisma + `@prisma/client`                                             | ^6.1.0       |
| `passport` / `passport-jwt`                                           | ^0.7 / ^4    |
| `class-validator` / `class-transformer`                               | ^0.14 / ^0.5 |
| `bcryptjs`                                                            | ^2.4.3       |
| jest / ts-jest                                                        | ^29.x        |

## Ports

| Service                                  | Port | URL                                                   |
| ---------------------------------------- | ---- | ----------------------------------------------------- |
| Web                                      | 3000 | http://localhost:3000                                 |
| Mini App                                 | 3001 | http://localhost:3001                                 |
| API                                      | 4000 | http://localhost:4000/api                             |
| Postgres (docker-compose)                | 5432 | `postgresql://melodix:melodix@localhost:5432/melodix` |
| Redis (docker-compose, not yet wired in) | 6379 | `redis://localhost:6379`                              |

## Environment variables

### `apps/api/.env`

| Var                  | Required                       | Used by                         | Notes                                                                                       |
| -------------------- | ------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------- |
| `DATABASE_URL`       | yes (for auth/playlists/likes) | Prisma                          | docker-compose default: `postgresql://melodix:melodix@localhost:5432/melodix?schema=public` |
| `JWT_SECRET`         | yes                            | `auth/`                         | Any non-empty string in dev                                                                 |
| `JAMENDO_CLIENT_ID`  | no                             | `jamendo/`                      | Without it, the API serves `DEMO_TRACKS`                                                    |
| `TELEGRAM_BOT_TOKEN` | no                             | `auth.service.ts:telegramLogin` | Required to verify Mini App `initData`                                                      |
| `CORS_ORIGIN`        | no                             | `main.ts`                       | Comma-separated allow-list; defaults to `*`                                                 |
| `PORT`               | no                             | `main.ts`                       | Defaults to `4000`                                                                          |

### `apps/web/.env.local`

| Var                   | Notes                                                          |
| --------------------- | -------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | Defaults to `http://localhost:4000`. Used by `src/lib/api.ts`. |

### `apps/miniapp/.env.local`

| Var                   | Notes          |
| --------------------- | -------------- |
| `NEXT_PUBLIC_API_URL` | Same as above. |

## Top-level scripts (`pnpm <script>`)

|                  | What it does                                                       |
| ---------------- | ------------------------------------------------------------------ |
| `pnpm install`   | Install all workspaces                                             |
| `pnpm dev`       | `turbo run dev --concurrency=20` — web + miniapp + api in parallel |
| `pnpm build`     | Build everything                                                   |
| `pnpm typecheck` | `tsc --noEmit` per package                                         |
| `pnpm lint`      | `next lint` / `eslint` per package, `--max-warnings 0`             |
| `pnpm test`      | Run jest suites (currently only `apps/api`, `--passWithNoTests`)   |
| `pnpm format`    | Prettier write across `**/*.{ts,tsx,js,jsx,json,md}`               |
| `pnpm clean`     | Delete every package's build outputs + root `node_modules`         |

## Per-app scripts

```bash
# API
pnpm --filter @melodix/api dev                     # nest start --watch
pnpm --filter @melodix/api prisma:generate
pnpm --filter @melodix/api prisma:migrate          # dev migration
pnpm --filter @melodix/api prisma:deploy           # CI / prod
pnpm --filter @melodix/api prisma:seed

# Web / Mini App
pnpm --filter @melodix/web dev
pnpm --filter @melodix/miniapp dev
```

## CI

`.github/workflows/ci.yml` runs on `push` to `main` and on every PR:

1. `pnpm install --frozen-lockfile`
2. `pnpm --filter @melodix/api prisma:generate`
3. `pnpm typecheck`
4. `pnpm lint`
5. `pnpm build`

`.github/workflows/context-freshness.yml` (added in this PR) runs alongside
and warns if a PR changes code without updating any `.agents/context/` file.
