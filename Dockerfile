ARG NODE_VERSION=24-alpine

FROM node:${NODE_VERSION} AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat python3 make g++

# ----- deps -----
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# ----- builder -----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable pnpm && pnpm build

# ----- runner -----
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=file:/data/eat.db

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Migrations + script de démarrage
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/src/lib/db ./src/lib/db
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=builder /app/node_modules/postgres ./node_modules/postgres
COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh && mkdir -p /data && chown nextjs:nodejs /data

USER nextjs
EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "server.js"]
