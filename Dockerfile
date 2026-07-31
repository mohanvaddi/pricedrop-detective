FROM node:24-bookworm

WORKDIR /app

RUN npm install -g pnpm tsx

# Install backend dependencies first (cached unless a manifest/lockfile changes)
# All workspace package.json files must be present before install so pnpm can
# resolve the `workspace:*` links between @pricedrop/* packages.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY scrapers/package.json ./scrapers/
COPY web/package.json ./web/
RUN pnpm install --frozen-lockfile

# Install the Camoufox browser (stealth Firefox fork) + Firefox system deps and
# xvfb (headed stealth on a virtual display). Camoufox replaces Chromium for all
# browser-based scraping. camoufox-js lives in the @pricedrop/scrapers package.
ENV CAMOUFOX_INSTALL_DIR=/opt/camoufox
RUN pnpm --filter @pricedrop/scrapers exec playwright install-deps firefox \
    && apt-get update && apt-get install -y --no-install-recommends xvfb \
    && rm -rf /var/lib/apt/lists/* \
    && pnpm --filter @pricedrop/scrapers exec camoufox-js fetch

# Copy source after heavy layers are cached
COPY . .

EXPOSE 4000

CMD ["tsx", "server/server.ts"]
