# Tech Stack — Ghost Relay

## Ringkasan Arsitektur

```
┌──────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React SPA)                         │
│   TanStack Router · TanStack Query v5 · Zustand v5                  │
│   shadcn/ui · Tailwind CSS v4 · Socket.io-client                    │
│   Vite · TypeScript 6.x                                              │
└──────────────────────────────────────────────────────────────────────┘
                              │
                  REST + WebSocket (Socket.io)
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Modular Monolith)                        │
│   Fastify v5 · Socket.io · TypeScript 6.x · Node.js 22+             │
│                                                                      │
│   Modules:       │   Core:                    │   Plugins:           │
│   ─────────      │   ──────────               │   ─────────          │
│   auth           │   AI (Vercel AI SDK)       │   auth (JWT)         │
│   messages       │   Encryption (AES-256-GCM) │   socket (WS auth)   │
│   voice          │   EventBus                  │                      │
│   files          │   TaskQueue (BullMQ/Redis) │                      │
│   platforms      │   Vector Store (PG JSONB)  │                      │
│   memory         │   Chat SDK (@chat-adapter) │                      │
│   reports        │   Memory Store             │                      │
│   ai             │                             │                      │
│   webhook        │                             │                      │
│   settings       │                             │                      │
└──────────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────────┐
│   PostgreSQL     │ │   Redis          │ │  External APIs           │
│   (Prisma ORM)   │ │   (BullMQ,       │ │                          │
│   + JSONB vector │ │    Chat SDK)     │ │  · OpenAI-compatible LLM │
│                  │ │                  │ │  · WhatsApp Cloud API    │
│                  │ │                  │ │  · Telegram Bot API      │
│                  │ │                  │ │  · Slack Events API      │
│                  │ │                  │ │  · models.dev catalog    │
└──────────────────┘ └──────────────────┘ └──────────────────────────┘
```

---

## Frontend Stack

| Komponen | Pilihan | Alasan |
|----------|---------|--------|
| **Framework** | React 19 + TypeScript 6.x | Ekosistem terbesar, React Compiler |
| **Build Tool** | Vite 8.x | Super cepat, HMR instan |
| **Routing** | TanStack Router | Type-safe penuh (routes, params, search params) |
| **Server State** | TanStack Query v5 | Caching, refetch, loading states otomatis |
| **Client State** | Zustand v5 | Ringan, pattern slices |
| **UI Library** | shadcn/ui + @base-ui/react + Tailwind CSS v4 | Aksesibel, kustomisasi penuh |
| **Icons** | Lucide React | Library icon terpopuler |
| **WebSocket** | Socket.io-client | Reconnect otomatis, fallback long-polling |
| **AI Components** | ai-elements (48 komponen) | Message, Conversation, PromptInput, CodeBlock, dll |
| **Markdown** | Streamdown (cjk, code, math, mermaid) | Render plugin-based |
| **Syntax Highlight** | Shiki | Github-light/dark themes |
| **Form** | TanStack Form + Zod | Headless, validasi native |

---

## Backend Stack

| Komponen | Pilihan | Alasan |
|----------|---------|--------|
| **Framework** | Fastify v5 | Async-first,高性能, plugin-based |
| **Bahasa** | TypeScript 6.x + Node.js 22+ | Type safety + ESM native |
| **Runtime** | tsx (dev), Node.js (production) | Hot-reload, ESM |

### Database

| Komponen | Pilihan |
|----------|---------|
| **Primary DB** | PostgreSQL 16 |
| **ORM** | Prisma 6.x |
| **Vector Store** | PostgreSQL JSONB + Cosine Similarity in-memory |

### AI / LLM

| Komponen | Pilihan |
|----------|---------|
| **AI SDK** | Vercel AI SDK (`ai` v7) |
| **Providers** | `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google` |
| **Audio** | OpenAI SDK (`client.audio.transcriptions.create`) |
| **Catalog** | models.dev — dynamic provider/model discovery |

### Task Queue

| Komponen | Pilihan |
|----------|---------|
| **Queue** | BullMQ (Redis) |
| **Fallback** | Local `setImmediate` queue |
| **Redis** | ioredis |

### Real-time

| Komponen | Pilihan |
|----------|---------|
| **Server** | Socket.io (Node.js) |
| **Client** | Socket.io-client |

### Chat Integration

| Platform | Library |
|----------|---------|
| **Telegram** | `@chat-adapter/telegram` |
| **WhatsApp** | `@chat-adapter/whatsapp` |
| **Slack** | `@chat-adapter/slack` |
| **State** | `@chat-adapter/state-redis` |

### Auth & Security

| Komponen | Pilihan |
|----------|---------|
| **Auth** | Better Auth + Prisma adapter |
| **Encryption** | AES-256-GCM (Node.js crypto) |
| **JWT** | jsonwebtoken |
| **Rate Limit** | `@fastify/rate-limit` |
| **CORS** | `@fastify/cors` |

---

## Struktur Monorepo (pnpm Workspaces + Turborepo)

```
ghost-team/
├── apps/
│   ├── backend/         # @ghost/backend — Fastify API server
│   │   └── src/
│   │       ├── core/         # AI, encryption, memory, task queue, dll
│   │       ├── modules/      # Domain modules (auth, messages, voice, dll)
│   │       └── plugins/      # Fastify plugins (auth, socket)
│   └── frontend/        # frontend — React SPA
│       └── src/
│           ├── routes/       # TanStack Router file-based
│           ├── components/   # shadcn/ui + ai-elements
│           │   ├── ui/           # Primitives (button, input, card, dll)
│           │   ├── ai-elements/  # AI output components (48 files)
│           │   ├── chat/         # ChatBubble, ChatList, ChatInput
│           │   ├── settings/     # AIProviders, Platforms, Reports
│           │   ├── sidebar/      # ChannelList, KnowledgeVault
│           │   └── ...           # onboarding, layout, dll
│           ├── hooks/        # useMessages, useSocketEvents, dll
│           ├── stores/       # authStore, uiStore (Zustand)
│           └── lib/          # api client, socket, utils
├── packages/
│   ├── database/        # @ghost/database — Prisma schema + client
│   │   ├── prisma/          # schema.prisma + migrations
│   │   └── src/             # Extended Prisma client
│   ├── shared/          # @ghost/shared — Zod schemas + types
│   └── config/          # @ghost/config — Zod-validated env
├── package.json         # Workspace root
├── pnpm-workspace.yaml  # pnpm workspace definition
└── turbo.json           # Turborepo task pipeline
```

---

## Design Patterns

| Pola | Implementasi |
|------|-------------|
| **Modular Monolith** | `modules/` — domain terpisah, satu proses |
| **Monorepo** | pnpm workspaces + Turborepo |
| **Event-Driven** | EventBus in-app (Node.js EventEmitter) |
| **Compound Components** | ai-elements (Message+Content+Actions, Tool+Header+Content) |
| **Provider Pattern** | React Context (PromptInputProvider, ReasoningContext) |
| **RAG Pipeline** | Embedding → Vector Search → Cosine Similarity → LLM Generate |

---

## Security

| Area | Approach |
|------|----------|
| **Credentials** | Encrypted AES-256-GCM di PostgreSQL |
| **Auth** | Session-based JWT via Better Auth |
| **Webhook Verification** | HMAC-SHA256 (WhatsApp, Slack), secret token (Telegram) |
| **Rate Limiting** | 100 req/min per IP |
| **CORS** | Configurable origins |
| **File Storage** | Local directory per user ID |

---

## Development

```bash
# Install
pnpm install
pnpm db:generate

# Run
pnpm dev                    # Backend :8000 + Frontend :5173
pnpm --filter @ghost/backend dev   # Backend only
pnpm --filter frontend dev         # Frontend only

# Test & Lint
pnpm --filter @ghost/backend test
pnpm --filter @ghost/backend typecheck
pnpm --filter frontend typecheck
pnpm lint
```
