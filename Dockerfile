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

EXPOSE 4000

CMD ["tsx", "server.ts"]
