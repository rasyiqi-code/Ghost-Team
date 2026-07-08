# Ghost Relay 👻

**Pusat komunikasi multi-platform + AI.** Satu dashboard untuk mengelola pesan dari Telegram, WhatsApp, Slack, dan Web — dengan dukungan AI untuk transkripsi voice note, auto-reply berbasis memori, dan knowledge vault.

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| **Universal Inbox** | Satukan chat dari WhatsApp, Telegram, Slack, dan Web dalam satu feed |
| **Smart Voice Processing** | Voice note → transkripsi → ringkasan → task decomposition otomatis |
| **Auto-Reply RAG** | Jawab pertanyaan berulang dengan referensi dari histori chat |
| **Knowledge Vault** | File otomatis terindeks + semantic search + folder grouping |
| **Voice Command** | Bicara ke mikrofon di PC, pesan terkirim ke grup WhatsApp tanpa sentuh HP |
| **AI Provider Agnostic** | Bebas pilih LLM (OpenAI, Qwen, Claude, Gemini, Groq, dll) |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui |
| **Routing** | TanStack Router (type-safe) |
| **Server State** | TanStack Query v5 |
| **Client State** | Zustand v5 |
| **Backend** | Node.js 22+ + Fastify v5 + TypeScript |
| **Database** | PostgreSQL + Prisma ORM |
| **Vector Store** | PostgreSQL JSONB + Cosine Similarity (in-memory) |
| **Task Queue** | BullMQ + Redis (fallback local `setImmediate`) |
| **Real-time** | Socket.io (server + client) |
| **AI SDK** | Vercel AI SDK (`ai` + `@ai-sdk/openai`) — multi-provider |
| **Chat Platform** | Chat SDK (`@chat-adapter/*`: Slack, Telegram, WhatsApp) |
| **Auth** | Better Auth + JWT |
| **Encryption** | AES-256-GCM untuk credentials |
| **Package Manager** | pnpm (workspace monorepo) + Turborepo |
| **Runtime** | Bun (package manager), Node.js (runtime) |

---

## 📁 Struktur Monorepo

```
ghost-team/
├── apps/
│   ├── backend/          # Fastify API server
│   │   ├── src/
│   │   │   ├── core/     # AI, encryption, memory store, task queue
│   │   │   ├── modules/  # auth, messages, voice, files, platforms, dll
│   │   │   └── plugins/  # auth, socket
│   │   └── tests/
│   └── frontend/         # React SPA
│       └── src/
│           ├── routes/       # TanStack Router
│           ├── components/   # shadcn/ui + ai-elements
│           ├── hooks/        # TanStack Query hooks
│           └── stores/       # Zustand
├── packages/
│   ├── database/         # Prisma schema + client
│   ├── shared/           # Zod schemas + TypeScript types
│   └── config/           # Zod-validated env variables
├── docker-compose.yml    # PostgreSQL + app
└── Dockerfile            # Multi-stage build
```

---

## 🚀 Quick Start

### Prasyarat

- **Node.js** 22+
- **pnpm** 9+ (`npm install -g pnpm`)
- **Bun** 1.3+ (opsional, untuk package manager)
- **PostgreSQL** 16 (atau via Docker)
- **Docker** + Docker Compose (opsional)

### 1. Clone & Install

```bash
git clone <repo>
cd ghost-team

# Install semua dependencies (workspace)
pnpm install

# Generate Prisma client
pnpm db:generate
```

### 2. Setup Environment

```bash
cp .env.example .env
# Isi minimal:
# DATABASE_URL=postgresql://ghost:changeme@localhost:5432/ghost_relay
# JWT_SECRET_KEY=<random-string>
# ENCRYPTION_KEY=<random-32-char>
# CRYPTO_SALT=<random-string>
```

Atau jalankan PostgreSQL via Docker:

```bash
docker compose up -d db
# PostgreSQL akan berjalan di port 5433
```

### 3. Database Migration

```bash
pnpm db:push     # Push schema ke database
# atau
pnpm db:migrate  # Migrasi dengan history
```

### 4. Jalankan Development

```bash
pnpm dev
```

Ini akan menjalankan:
- **Backend**: http://localhost:8000 (Fastify, hot-reload via tsx)
- **Frontend**: http://localhost:5173 (Vite, HMR)

Atau secara terpisah:

```bash
# Terminal 1 — Backend
pnpm --filter @ghost/backend dev

# Terminal 2 — Frontend
pnpm --filter frontend dev
```

### 5. Login

Seeder otomatis membuat admin saat pertama kali database kosong:

- **Email**: `admin@ghost.local`
- **Password**: `admin123`

---

## 🐳 Docker (Production)

```bash
# Build & jalankan semua service (PostgreSQL + app)
docker compose up -d

# Akses di http://localhost:8000
```

Untuk development dengan Redis:

```bash
docker compose -f docker-compose.full.yml up -d
```

---

## 🔧 Environment Variables

| Variable | Default | Keterangan |
|----------|---------|------------|
| `DATABASE_URL` | `postgresql://ghost:changeme@localhost:5432/ghost_relay` | Koneksi PostgreSQL |
| `REDIS_URL` | `""` | Redis URL (kosong = task runner built-in) |
| `JWT_SECRET_KEY` | **required** | Secret key untuk JWT |
| `ENCRYPTION_KEY` | **required** | Key enkripsi AES-256-GCM |
| `CRYPTO_SALT` | **required** | Salt untuk key derivation |
| `CORS_ORIGINS` | `["*"]` | Origin yang diizinkan |
| `ADMIN_EMAIL` | `admin@ghost.local` | Email admin seeder |
| `ADMIN_PASSWORD` | `admin123` | Password admin seeder |
| `ENVIRONMENT` | `production` | `development` / `production` / `test` |
| `OPENAI_API_KEY` | — | API key untuk AI provider default |
| `TELEGRAM_BOT_TOKEN` | — | Token bot Telegram |
| `SLACK_BOT_TOKEN` | — | Token bot Slack |
| `WHATSAPP_ACCESS_TOKEN` | — | Token API WhatsApp |

---

## 📖 API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/auth/*` | Better Auth (login, register, session) |
| `GET` | `/api/messages` | Histori chat (paginated) |
| `POST` | `/api/messages/send` | Kirim pesan |
| `POST` | `/api/messages/search` | Cari pesan |
| `POST` | `/api/voice/process` | Upload voice note (async) |
| `POST` | `/api/voice/command` | Voice command → transcribe + intent → kirim |
| `GET` | `/api/voice/status/:id` | Cek status processing |
| `GET` | `/api/files` | List file di Knowledge Vault |
| `POST` | `/api/files/upload` | Upload file |
| `GET` | `/api/files/download/:id` | Download file |
| `POST` | `/api/files/search` | Semantic search file |
| `GET` | `/api/settings/platforms` | Platform connections |
| `POST` | `/api/ai/providers` | CRUD AI providers |
| `GET` | `/api/ai/providers/browse` | Browse models.dev catalog |
| `POST` | `/api/ai/chat/stream` | Streaming chat (SSE) |
| `POST` | `/api/webhook/telegram` | Telegram webhook |
| `GET/POST` | `/api/webhook/whatsapp` | WhatsApp webhook |
| `POST` | `/api/webhook/slack` | Slack webhook |

---

## 🧪 Testing

```bash
# Backend tests
pnpm --filter @ghost/backend test

# Type checking
pnpm --filter @ghost/backend typecheck
pnpm --filter frontend typecheck

# Linting
pnpm lint
```

---

## 🔐 Security

- **Credentials**: API keys platform dienkripsi AES-256-GCM sebelum disimpan
- **Auth**: Session-based JWT via Better Auth
- **Rate Limit**: 100 req/min per IP
- **Webhook Signature**: HMAC-SHA256 (WhatsApp, Slack), secret token (Telegram)

---

## 📝 Lisensi

Private — Hackathon Project
