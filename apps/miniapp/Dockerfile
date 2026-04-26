# ── Stage 1: install + build ──────────────────────────────────────────
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.1 --activate
WORKDIR /app

# Copy workspace config first for layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY apps/miniapp/package.json apps/miniapp/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/

RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared/ packages/shared/
COPY packages/ui/ packages/ui/
COPY apps/miniapp/ apps/miniapp/

# Build arg for API URL (baked into the Next.js client bundle)
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN pnpm --filter @melodix/miniapp build

# ── Stage 2: production image ────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/miniapp/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/miniapp/.next/static ./apps/miniapp/.next/static

USER nextjs
EXPOSE 3001

CMD ["node", "apps/miniapp/server.js"]
