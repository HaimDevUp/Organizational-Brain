FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/worker-indexer/package.json apps/worker-indexer/
COPY packages ./packages
RUN pnpm install --frozen-lockfile

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/worker-indexer/node_modules ./apps/worker-indexer/node_modules
COPY . .
RUN pnpm db:generate
CMD ["pnpm", "--filter", "@obos/worker-indexer", "start"]
