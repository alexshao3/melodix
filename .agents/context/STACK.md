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
| husky                | ^9.1.7   |
| lint-staged          | ^15.5.2  |
| `@playwright/test`   | ^1.59.1  |
| Tailwind CSS         | ^3.4.17  |
| PostCSS              | ^8.4.49  |
| autoprefixer         | ^10.4.20 |

## Frontend

|                                    | Version  |
| ---------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| Next.js                            | ^15.1.3  |
| React / React-DOM                  | ^19.0.0  |
| framer-motion                      | ^11.15.0 |
| next-themes (web)                  | ^0.4.6   |
| zustand (web)                      | ^5.0.2   |
| lucide-react                       | ^0.469.0 |
| clsx                               | ^2.1.1   |
| tailwind-merge                     | ^2.5.5   |
| @fontsource-variable/inter         | ^5.2.x   | Variable Inter shipped via npm (no Google Fonts fetch at build time, ADR-0027)         |
| @fontsource-variable/space-grotesk | ^5.2.x   | Variable Space Grotesk shipped via npm (no Google Fonts fetch at build time, ADR-0027) |

## Backend

|                                                                       | Version      |
| --------------------------------------------------------------------- | ------------ |
| NestJS (`@nestjs/{common,core,platform-express,config,jwt,passport}`) | ^10.x        |
| `@nestjs/throttler`                                                   | ^6.5.0       |
| `ioredis`                                                             | ^5.10.1      |
| Prisma + `@prisma/client`                                             | ^6.1.0       |
| `passport` / `passport-jwt`                                           | ^0.7 / ^4    |
| `class-validator` / `class-transformer`                               | ^0.14 / ^0.5 |
| `bcryptjs`                                                            | ^2.4.3       |
| `@aws-sdk/client-s3`                                                  | ^3.x         |
| `@aws-sdk/s3-request-presigner`                                       | ^3.x         |
| `multer` / `@types/multer`                                            | ^1.x         |
| jest / ts-jest                                                        | ^29.x        |

## Ports

| Service                   | Port | URL                                                                 |
| ------------------------- | ---- | ------------------------------------------------------------------- |
| Web                       | 3000 | http://localhost:3000                                               |
| Mini App                  | 3001 | http://localhost:3001                                               |
| Admin dashboard           | 3002 | http://localhost:3002 (Phase 2; ADR-0021)                           |
| API                       | 4000 | http://localhost:4000/api                                           |
| Postgres (docker-compose) | 5432 | `postgresql://melodix:melodix@localhost:5432/melodix`               |
| Redis (docker-compose)    | 6379 | `redis://localhost:6379` (Jamendo cache, lyrics cache, future jobs) |

## Environment variables

### `apps/api/.env`

| Var                    | Required                             | Used by                                | Notes                                                                                                                                                |
| ---------------------- | ------------------------------------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`         | yes (for auth/playlists/likes)       | Prisma                                 | docker-compose default: `postgresql://melodix:melodix@localhost:5432/melodix?schema=public`                                                          |
| `JWT_SECRET`           | yes                                  | `auth/`                                | Any non-empty string in dev                                                                                                                          |
| `JAMENDO_CLIENT_ID`    | no                                   | `jamendo/`                             | Without it, the API serves `DEMO_TRACKS`                                                                                                             |
| `REDIS_URL`            | no                                   | `cache/`                               | E.g. `redis://localhost:6379`. When unset, the API runs without cache (every request hits upstream).                                                 |
| `TELEGRAM_BOT_TOKEN`   | no                                   | `auth.service.ts:telegramLogin`        | Required to verify Mini App `initData`                                                                                                               |
| `CORS_ORIGIN`          | no                                   | `main.ts`                              | Comma-separated allow-list; defaults to `*`                                                                                                          |
| `STORAGE_BACKEND`      | no                                   | `storage/storage.service.ts`           | `s3` (default) or `postgres`. Selects which `StorageBackend` is instantiated at boot. See ADR-0026.                                                  |
| `S3_ENDPOINT`          | only when `STORAGE_BACKEND=s3`       | `storage/backends/s3.backend.ts`       | S3-compatible endpoint URL. Backblaze B2 default: `https://s3.us-west-004.backblazeb2.com`. Empty = AWS S3.                                          |
| `S3_REGION`            | only when `STORAGE_BACKEND=s3`       | `storage/backends/s3.backend.ts`       | Region. B2: `us-west-004` etc. Use `auto` for Cloudflare R2.                                                                                         |
| `S3_ACCESS_KEY_ID`     | only when `STORAGE_BACKEND=s3`       | `storage/backends/s3.backend.ts`       | Provider access key id (B2 keyID, R2 access key, AWS access key).                                                                                    |
| `S3_SECRET_ACCESS_KEY` | only when `STORAGE_BACKEND=s3`       | `storage/backends/s3.backend.ts`       | Provider secret (B2 applicationKey, R2 secret, AWS secret).                                                                                          |
| `S3_BUCKET`            | only when `STORAGE_BACKEND=s3`       | `storage/backends/s3.backend.ts`       | Bucket name; defaults to `melodix`.                                                                                                                  |
| `S3_PUBLIC_URL`        | only when `STORAGE_BACKEND=s3`       | `storage/backends/s3.backend.ts`       | Public URL prefix for uploaded files. B2 public bucket: `https://f<cluster>.backblazeb2.com/file/<bucket>`.                                          |
| `S3_FORCE_PATH_STYLE`  | no                                   | `storage/backends/s3.backend.ts`       | `'true'` to force path-style URLs (rarely needed). Default `false`.                                                                                  |
| `API_PUBLIC_URL`       | only when `STORAGE_BACKEND=postgres` | `storage/backends/postgres.backend.ts` | Public base URL of the API. Upload URLs become `${API_PUBLIC_URL}/api/storage/<folder>/<filename>` and must be browser-fetchable from web + miniapp. |
| `PORT`                 | no                                   | `main.ts`                              | Defaults to `4000`                                                                                                                                   |

### `apps/web/.env.local`

| Var                   | Notes                                                          |
| --------------------- | -------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | Defaults to `http://localhost:4000`. Used by `src/lib/api.ts`. |

### `apps/miniapp/.env.local`

| Var                   | Notes          |
| --------------------- | -------------- |
| `NEXT_PUBLIC_API_URL` | Same as above. |

### `apps/admin/.env.local`

| Var                   | Notes                                                            |
| --------------------- | ---------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | Same as above. Admin client calls `/api/admin/*` on this origin. |

### Runner / E2E (shell-level only — NOT loaded from any `.env` file)

These are read by `process.env` in the Playwright runner / GitHub Actions
workflow, not by NestJS's `ConfigModule`. They must be exported in the
shell (or set in CI workflow `env:`) — putting them in `apps/api/.env`
has no effect.

| Var                  | Notes                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| `MELODIX_E2E_AUTHED` | Set to `1` to opt into the DB-backed Playwright suite (`e2e/authed.spec.ts`). CI sets it. See ADR-0018. |

## Top-level scripts (`pnpm <script>`)

|                     | What it does                                                       |
| ------------------- | ------------------------------------------------------------------ |
| `pnpm install`      | Install all workspaces                                             |
| `pnpm dev`          | `turbo run dev --concurrency=20` — web + miniapp + api in parallel |
| `pnpm build`        | Build everything                                                   |
| `pnpm typecheck`    | `tsc --noEmit` per package                                         |
| `pnpm lint`         | `next lint` / `eslint` per package, `--max-warnings 0`             |
| `pnpm test`         | Run jest suites (currently only `apps/api`, 53 tests pass)         |
| `pnpm e2e`          | Run Playwright smoke (`e2e/*.spec.ts`); auto-spawns API+web        |
| `pnpm e2e:ui`       | Same, but in Playwright's UI mode for local debugging              |
| `pnpm format`       | Prettier write across `**/*.{ts,tsx,js,jsx,json,md}`               |
| `pnpm format:check` | Prettier `--check` (CI-friendly)                                   |
| `pnpm clean`        | Delete every package's build outputs + root `node_modules`         |

## Per-app scripts

```bash
# API
pnpm --filter @melodix/api dev                     # nest start --watch
pnpm --filter @melodix/api prisma:generate
pnpm --filter @melodix/api prisma:migrate          # dev migration
pnpm --filter @melodix/api prisma:deploy           # CI / prod
pnpm --filter @melodix/api prisma:seed

# Web / Mini App / Admin
pnpm --filter @melodix/web dev
pnpm --filter @melodix/miniapp dev
pnpm --filter @melodix/admin dev                   # → http://localhost:3002
```

## CI

`.github/workflows/ci.yml` runs on `push` to `main` and on every PR:

1. `pnpm install --frozen-lockfile`
2. `pnpm --filter @melodix/api prisma:generate`
3. `pnpm typecheck`
4. `pnpm lint`
5. `pnpm build`

A separate `migrations` job (added in ADR-0028) spins up `postgres:16-alpine`
as a service container and runs `prisma migrate deploy` followed by
`prisma migrate diff --from-schema-datasource ... --to-schema-datamodel ... --exit-code`
to guarantee the checked-in migrations actually produce a database that
matches `schema.prisma`. This is the regression test for "Dockerfile runs
`migrate deploy` but `prisma/migrations/` is missing or out-of-date".

`.github/workflows/e2e.yml` runs in parallel with `ci.yml`. It provisions a
`postgres:16-alpine` service container (port 5432, db/user/pass all
`melodix`) and runs: install → `prisma:generate` → `prisma db push
--accept-data-loss` → `prisma:seed` (creates the `demo`/`melodix123` user)
→ `pnpm build` → cache `~/.cache/ms-playwright` keyed on `pnpm-lock.yaml`
→ install chromium (or system deps if cache hit) → `pnpm e2e`. The
workflow exports `MELODIX_E2E_AUTHED=1` so `e2e/authed.spec.ts` runs;
locally the same suite is gated off unless you opt in with the same flag
**plus** a running Postgres. Always uploads `playwright-report/` (7-day
retention); uploads `test-results/` traces only on failure.

`.github/workflows/context-freshness.yml` runs alongside and warns if a PR
changes code without updating any `.agents/context/` file.

## Docker (self-host production)

Per-app Dockerfiles produce optimised production images:

| Dockerfile                | Base           | Notes                                                                                 |
| ------------------------- | -------------- | ------------------------------------------------------------------------------------- |
| `apps/api/Dockerfile`     | node:22-alpine | Multi-stage. Runs `prisma migrate deploy` on startup, then `node dist/…/main.js`.     |
| `apps/web/Dockerfile`     | node:22-alpine | Multi-stage. Next.js `output: 'standalone'`. `NEXT_PUBLIC_API_URL` set via build arg. |
| `apps/miniapp/Dockerfile` | node:22-alpine | Same pattern as web.                                                                  |
| `apps/admin/Dockerfile`   | node:22-alpine | Same pattern as web. Exposes port `3002`. ADR-0021.                                   |

`docker-compose.yml` orchestrates all services + a Cloudflare Tunnel sidecar:

```bash
# Quick start
cp .env.production.example .env.production   # edit values
docker compose --env-file .env.production up -d --build
```

Services: `api`, `web`, `miniapp`, `admin`, `cloudflared` (active). `postgres` and `redis` are
commented out — currently using cloud providers. Uncomment to run locally.

Database and Redis can be swapped for cloud providers (Supabase, Neon, Upstash, etc.)
by changing `DATABASE_URL` / `REDIS_URL` in `.env.production`.

`docker-compose.dev.yml` provides local Postgres + Redis for development (no env vars needed):

```bash
docker compose -f docker-compose.dev.yml up -d
```

## Pre-commit (local)

`husky@9` is installed via the root `prepare` script so `pnpm install` wires
everything up automatically. The hook at `.husky/pre-commit` runs
`pnpm exec lint-staged`, which currently runs `prettier --write` on staged
`*.{ts,tsx,js,jsx,json,md,yml,yaml}` files. Configuration lives in the root
`package.json` `lint-staged` field. ESLint is intentionally **not** in the
pre-commit chain yet (kept fast); run `pnpm lint` manually before pushing.

## Tests (where & how)

The `pnpm test` task at the root delegates to Turborepo. Today only
`apps/api` has Jest configured ([`apps/api/jest.config.ts`](../../apps/api/jest.config.ts)),
and it owns the cross-package test suite via a `moduleNameMapper` that points
`@melodix/shared` at `packages/shared/src`. To add tests for a different
package either co-locate them under `apps/api/src/` (cheap) or stand up a
separate Jest config in that package (preferred long-term).
