FROM node:20-bookworm-slim AS base

ENV NODE_ENV=production \
  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
  PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app


FROM base AS deps

RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 \
  make \
  g++ \
  chromium \
  chromium-driver \
  ca-certificates \
  fonts-liberation \
  libnss3 \
  libatk-bridge2.0-0 \
  libgtk-3-0 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libgbm1 \
  libasound2 \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

RUN npm ci --omit=dev


FROM base AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
  chromium \
  chromium-driver \
  gosu \
  ca-certificates \
  fonts-liberation \
  libnss3 \
  libatk-bridge2.0-0 \
  libgtk-3-0 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libgbm1 \
  libasound2 \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY scripts ./scripts
COPY config.json ./config.json
COPY package.json ./package.json
COPY docker-entrypoint.sh /app/docker-entrypoint.sh

RUN chmod +x /app/docker-entrypoint.sh \
  && mkdir -p /app/session /app/data \
  && chown -R node:node /app

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "src/index.js"]
