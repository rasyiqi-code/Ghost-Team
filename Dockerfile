# ---- Stage 1: Install pnpm + deps ----
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml turbo.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/config/package.json ./packages/config/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --ignore-scripts

# ---- Stage 2: Build backend ----
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=deps /app /app
COPY . .
RUN CI=true pnpm --filter @ghost/backend build

# ---- Stage 3: Build frontend ----
FROM node:22-alpine AS frontend-builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=deps /app /app
COPY . .
RUN CI=true pnpm --filter frontend build

# ---- Stage 4: Runtime ----
FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=frontend-builder /app/apps/frontend/dist /app/frontend/dist
RUN echo '{"name":"runtime","private":true,"type":"module"}' > package.json && pnpm add tsx && rm -f pnpm-lock.yaml
ENV FRONTEND_DIR=/app/frontend/dist
ENV NODE_ENV=production
EXPOSE 8000
CMD ["node", "--import", "tsx/esm", "dist/main.js"]
