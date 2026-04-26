# ── Stage 1: install + build ──────────────────────────────────────────
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.1 --activate
WORKDIR /app

# Copy workspace config first for layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/

# Generate Prisma client + build
RUN pnpm --filter @melodix/api prisma:generate
RUN pnpm --filter @melodix/api build

# Prune dev dependencies
RUN pnpm prune --prod

# ── Stage 2: production image ────────────────────────────────────────
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

ENV NODE_ENV=production
EXPOSE 4000

# Run migrations then start
CMD ["sh", "-c", "cd apps/api && npx prisma migrate deploy && node dist/apps/api/src/main.js"]
