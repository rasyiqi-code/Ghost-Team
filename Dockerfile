# ---- Stage 1: Build everything ----
FROM oven/bun:1-alpine AS builder
RUN apk add --no-cache nodejs
WORKDIR /app
COPY package.json bun.lock turbo.json ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/config/package.json ./packages/config/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
RUN bun install --frozen-lockfile

COPY . .
RUN bun run db:generate
RUN bun x turbo build

# ---- Stage 2: Runtime ----
FROM oven/bun:1-alpine
WORKDIR /app
COPY package.json bun.lock turbo.json ./
COPY packages ./packages
COPY apps/backend/package.json ./apps/backend/
RUN bun install --production

COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/frontend/dist /app/frontend/dist
ENV FRONTEND_DIR=/app/frontend/dist
ENV NODE_ENV=production
EXPOSE 8000
CMD ["bun", "run", "dist/main.js"]
