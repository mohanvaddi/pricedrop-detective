FROM node:24-bookworm

WORKDIR /app

RUN npm install -g pnpm tsx

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Install Playwright's Chromium browser and its system dependencies
RUN npx playwright install --with-deps chromium

COPY . .

EXPOSE 4000

CMD ["tsx", "server.ts"]
