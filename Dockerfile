# ── Stage 1: build the React web UI ────────────────────────────────────────
FROM node:24-bookworm-slim AS web-builder

WORKDIR /web

COPY web/package.json web/package-lock.json* ./
RUN npm install --frozen-lockfile 2>/dev/null || npm install

COPY web/ ./
RUN npm run build

# ── Stage 2: runtime ────────────────────────────────────────────────────────
FROM node:24-bookworm

WORKDIR /app

RUN npm install -g pnpm tsx

# Install backend dependencies first (cached unless lockfile changes)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Install Playwright's Chromium browser and its system dependencies
# This layer is cached as long as the two COPY steps above don't change
RUN npx playwright install --with-deps chromium

# Copy source after heavy layers are cached
COPY . .

# Bring in the pre-built web UI from stage 1
COPY --from=web-builder /web/dist ./web/dist

EXPOSE 4000

CMD ["tsx", "server.ts"]
