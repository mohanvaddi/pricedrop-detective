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

# Install Playwright's Chromium browser and its system dependencies.
# playwright now lives in the @pricedrop/scrapers workspace package, so run the
# installer from that package's context (its node_modules/.bin) rather than root.
RUN pnpm --filter @pricedrop/scrapers exec playwright install --with-deps chromium

# Copy source after heavy layers are cached
COPY . .

EXPOSE 4000

CMD ["tsx", "server/server.ts"]
