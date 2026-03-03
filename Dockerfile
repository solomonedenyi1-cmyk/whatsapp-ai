FROM node:20-bookworm-slim AS base

ENV NODE_ENV=production

WORKDIR /app


FROM base AS deps

RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 \
  make \
  g++ \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

COPY .npmrc package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile --prod


FROM base AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
  gosu \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY scripts ./scripts
COPY package.json ./package.json
COPY docker-entrypoint.sh /app/docker-entrypoint.sh

RUN chmod +x /app/docker-entrypoint.sh \
  && mkdir -p /app/session /app/data /app/logs \
  && chown -R node:node /app

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "src/index.js"]
