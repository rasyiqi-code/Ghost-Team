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
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/frontend/dist /app/frontend/dist
ENV FRONTEND_DIR=/app/frontend/dist
ENV NODE_ENV=production
EXPOSE 8000
CMD ["bun", "run", "apps/backend/dist/main.js"]
