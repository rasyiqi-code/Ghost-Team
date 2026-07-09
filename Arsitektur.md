# Arsitektur Ghost Relay (Modular Monolith)

Berikut arsitektur lengkap sistem Ghost Relay berbasis **Modular Monolith** dalam struktur **Monorepo** dengan pnpm workspace.

---

## 1. Gambaran Arsitektur (High-Level)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React SPA)                               │
│                    ┌─────────────────────────────────┐                     │
│                    │   TanStack Router (Routing)     │                     │
│                    │   TanStack Query (Server State) │                     │
│                    │   Zustand (Client State)        │                     │
│                    │   TanStack Form (Form & Zod)    │                     │
│                    │   Socket.io-client (WebSocket)  │                     │
│                    └─────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    REST API (HTTP) │ WebSocket (Socket.io)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                  BACKEND API (Modular Monolith - Fastify)                  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Modules:                                                              │  │
│  │ - auth, messages, voice, files, platforms, memory, settings, reports  │  │
│  │                                                                       │  │
│  │ Core Components:                                                      │  │
│  │ - EventBus (In-App Event Broker)                                      │  │
│  │ - TaskQueue (BullMQ / ioredis / Local fallback)                       │  │
│  │ - PersistentVectorStore (Postgres JSONB Cosine Similarity)            │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌─────────────────────────┐ ┌─────────────────┐ ┌─────────────────────────────┐
│   Background Jobs       │ │   External API  │ │   Database Layer            │
│   (BullMQ + Redis)      │ │   Integrations  │ │                             │
│                         │ │                 │ │  ┌─────────────────────────┐│
│  - Voice Transcription  │ │  - WhatsApp     │ │  │ PostgreSQL (Data utama) ││
│  - Task Decomposition   │ │  - Telegram     │ │  └─────────────────────────┘│
│  - File Indexing        │ │  - Slack        │ │  ┌─────────────────────────┐│
│  - Auto-Reply Search    │ │                 │ │  │ Postgres JSONB          ││
│                         │ │  - Qwen Cloud   │ │  │ (Embeddings table)      ││
│                         │ │                 │ │  └─────────────────────────┘│
└─────────────────────────┘ └─────────────────┘ └─────────────────────────────┘
```

---

## 2. Struktur Monorepo (pnpm Workspaces + Turborepo)

Proyek ini menggunakan struktur monorepo untuk mempermudah manajemen dependensi, sharing tipe data, dan mempercepat build pipeline.

```
Ghost-Team/
├── apps/
│   ├── backend/          # Backend API (Fastify, TypeScript, Node.js)
│   │   └── src/
│   │       ├── app.ts            # Entrypoint Fastify
│   │       ├── core/             # Core utilities (encryption, AI, DB, dll.)
│   │       ├── modules/          # Domain-driven modular components (auth, files, dll.)
│   │       └── plugins/          # Fastify plugins (auth, socket)
│   └── frontend/         # Frontend SPA (React, TypeScript, Vite, Tailwind CSS v4)
│       └── src/
│           ├── routes/           # TanStack Router type-safe routes
│           ├── components/       # UI components (shadcn/ui, base-ui)
│           ├── hooks/            # TanStack Query custom hooks
│           └── stores/           # Zustand client state
├── packages/
│   ├── database/         # Database configuration & Drizzle schemas / migrations
│   ├── shared/           # Zod validation schemas & shared TypeScript types
│   └── config/           # Centralized environment config parsed dengan Zod
├── package.json          # Workspace root package config
├── pnpm-workspace.yaml   # pnpm workspace definition
└── turbo.json            # Turborepo task pipeline
```

---

## 3. Komunikasi Antar-Modul (Event-Driven)

Backend menggunakan **Event-Driven Architecture** di dalam memori menggunakan `EventBus` (`event-bus.ts`). Ini menjaga agar modul tetap independen (loose coupling) tanpa memanggil logic modul lain secara langsung.

*Contoh Alur:*
Ketika pesan baru masuk via Webhook / REST:
1. Modul mengirim event `message:created` melalui `EventBus`.
2. Modul lain (misal `voice` atau `memory`) mendengarkan event tersebut dan melakukan aksi lanjutan di luar HTTP request-response cycle.

---

## 4. Rincian Layer Sistem

### Layer 1: Presentation Layer (Frontend)

* **React 19** + TypeScript.
* **TanStack Router**: Routing type-safe penuh di sisi client.
* **TanStack Query (v5)**: Server state management (fetching, caching, mutation).
* **Zustand (v5)**: Client state (UI states seperti sidebar, status filter).
* **TanStack Form** + **Zod**: Form handling & validation.
* **shadcn/ui** + **@base-ui/react** + **Tailwind CSS v4**: UI/UX responsive dan modern.
* **Socket.io-client**: Real-time WebSocket connection.

---

### Layer 2: Application Layer (Backend API)

* **Fastify v5** (Node.js 22+): Framework web async berkinerja tinggi.
* **Zod** (via `@ghost/shared`): Validasi skema request/response body.
* **Socket.io**: WebSocket server untuk real-time update ke frontend.
* **Plugins**:
  * `authPlugin`: JWT token validation & token parsing.
  * `socketPlugin`: Inisialisasi WebSocket.

#### Endpoints Utama:
* `POST   /api/auth/login`          → Login user
* `GET    /api/messages`            → Mengambil histori chat (paginated)
* `POST   /api/messages/send`       → Mengirim pesan (Platform/Web)
* `POST   /api/messages/search`     → Mencari histori chat
* `POST   /api/voice/process`       → Mengirim voice note (async processing)
* `POST   /api/voice/command`       → Memproses file audio voice command
* `POST   /api/voice/command-text`  → Memproses teks voice command
* `GET    /api/voice/status/:id`    → Memeriksa status pemrosesan voice note
* `GET    /api/files`               → Mengambil file di Knowledge Vault
* `POST   /api/files/upload`        → Upload file ke Knowledge Vault
* `POST   /api/files/search`        → Semantic search file menggunakan vector embedding
* `GET    /api/files/download/:id`  → Mengunduh file dari Storage

---

### Layer 3: Business Logic & Background Task Layer

* **In-App Event Bus (`event-bus.ts`)**: Event broker lokal untuk komunikasi antar-modul.
* **Task Queue (`task-queue.ts`)**:
  * Menggunakan **BullMQ** + **ioredis** yang terintegrasi dengan **Redis** untuk backup background tasks.
  * Memiliki local non-blocking fallback (menggunakan `setImmediate` queue) apabila koneksi Redis tidak tersedia.
* **AI Services (`core/ai.ts`)**:
  * Mengintegrasikan API OpenAI-compatible (Qwen Cloud).
  * **transcribeAudio**: Transkripsi audio ke teks (menggunakan `qwen-audio-turbo`).
  * **summarizeText**: Membuat summary otomatis dari transkrip.
  * **decomposeTasks**: Mengekstrak daftar tugas berstruktur JSON (menggunakan model `qwen-plus`).
  * **extractIntent**: Mengekstrak maksud pesan WhatsApp/Telegram (voice command).
  * **generateEmbedding**: Membuat vector embeddings (menggunakan `text-embedding-v3`).

---

### Layer 4: Data Layer (Database & Vectors)

* **PostgreSQL** sebagai database utama.
* **Drizzle ORM** untuk query relasional dan manajemen skema/migrasi (`drizzle-kit`).
* **Vector Store (`memoryStore` / `PersistentVectorStore`)**:
  * Tidak menggunakan database eksternal khusus (seperti ChromaDB).
  * Vector embeddings disimpan dalam tabel `embeddings` di PostgreSQL dengan kolom tipe data `jsonb` berisi array of numbers (`number[]`).
  * Perhitungan kesamaan semantik menggunakan algoritma **Cosine Similarity** yang dihitung secara programmatik langsung di sisi aplikasi Node.js/TypeScript.

#### Skema Database (Drizzle):

1. **Users (`users` table)**:
   * `id`: serial / primary key
   * `email`: varchar(255) / unique
   * `passwordHash`: varchar(255)
   * `name`: varchar(255)
   * `createdAt`: timestamp

2. **Messages (`messages` table)**:
   * `id`: serial / primary key
   * `userId`: integer REFERENCES users(id)
   * `platform`: varchar(50) ('whatsapp', 'telegram', 'slack', 'web')
   * `senderId`: varchar(255)
   * `senderName`: varchar(255)
   * `content`: varchar(10000)
   * `messageType`: varchar(20) ('text', 'voice_note', 'voice_processed')
   * `fileId`: integer REFERENCES files(id)
   * `platformMessageId`: varchar(255)
   * `isOutgoing`: boolean
   * `timestamp`: timestamp

3. **Files (`files` table)**:
   * `id`: serial / primary key
   * `userId`: integer REFERENCES users(id)
   * `originalName`: varchar(500)
   * `storageUrl`: varchar(1000)
   * `fileType`: varchar(100)
   * `folder`: varchar(255) (diklasifikasi otomatis oleh AI)
   * `sizeBytes`: bigint
   * `uploadedAt`: timestamp
   * `extractedText`: text

4. **Platform Connections (`platform_connections` table)**:
   * `id`: serial / primary key
   * `userId`: integer REFERENCES users(id)
   * `platform`: varchar(50)
   * `credentialsEncrypted`: text (AES-256 encrypted credentials)
   * `platformUserId`: varchar(255)
   * `isActive`: boolean

5. **AI Providers (`ai_providers` table)**:
   * `id`: serial / primary key
   * `userId`: integer REFERENCES users(id)
   * `providerType`: varchar(20)
   * `name`: varchar(255)
   * `apiBaseUrl`: varchar(500)
   * `apiKey`: varchar(500)
   * `modelId`: varchar(255)
   * `isActive`: boolean
   * `createdAt`: timestamp

6. **Embeddings (`embeddings` table)**:
   * `id`: serial / primary key
   * `userId`: integer
   * `referenceId`: varchar(255) (e.g. ID file atau ID chat)
   * `collection`: varchar(50) ('chat_memory' atau 'knowledge_vault')
   * `document`: text (raw text yang diekstrak)
   * `embedding`: jsonb (array `number[]` berisi representasi vector)
   * `metadata`: jsonb
   * `createdAt`: timestamp
   * *Constraint:* Unique index kombinasi `referenceId` dan `collection`

---

### Layer 5: External Integrations Layer

* **WhatsApp Business Cloud API**: Menggunakan webhook HTTP untuk pesan inbound, REST call untuk outbound.
* **Telegram Bot API**: Menggunakan webhook HTTP.
* **Slack Bolt SDK / Socket Mode**: Mengambil/mengirim pesan Telegram/Slack secara langsung.
* **Qwen Cloud (OpenAI-compatible client)**: Panggilan API AI secara modular untuk teks, transkripsi suara, klasifikasi folder, dan embedding.

---

## 5. Alur Data Utama (End-to-End)

### Skenario 1: Voice Note Masuk (Inbound)
```
1. Telegram / Webhook mengirim request ke apps/backend
2. Backend (Fastify) memvalidasi data dan menyimpan pesan dengan status '[Voice note processing...]'
3. Backend merespon client dengan status HTTP 202 (Accepted)
4. Event message:created di-trigger, memulai processVoiceNote secara async (non-blocking)
5. Modul Voice mengunduh audio → panggil qwen-audio-turbo (transcribeAudio) → panggil qwen-plus (decomposeTasks untuk list tugas)
6. Update tabel messages dengan transkrip, summary, dan daftar tugas
7. Trigger WebSocket 'voice_processed' untuk mengupdate UI Frontend
8. Buat embedding dari transkrip dan simpan ke database PostgreSQL (embeddings table)
```

### Skenario 2: Semantic Search (Auto-Reply & Knowledge Search)
```
1. Frontend mengirim query pencarian semantik (misal: "mencari manual WhatsApp")
2. Backend memanggil Qwen API untuk membuat query embedding
3. memoryStore mengambil data tabel embeddings (collection: 'knowledge_vault' atau 'chat_memory') yang relevan bagi user
4. Aplikasi menghitung Cosine Similarity secara manual pada array embedding
5. Mengurutkan hasil berdasarkan kecocokan tertinggi
6. Query detail file dari tabel files berdasarkan reference_id
7. Mengembalikan data file hasil pencarian semantik beserta potongan teks
```

---

## 6. Security Architecture

* **Authentication**: JWT token untuk otentikasi stateless.
* **Data Protection**: Kredensial platform eksternal dienkripsi menggunakan algoritma **AES-256-CBC** dengan `ENCRYPTION_KEY` dan `CRYPTO_SALT` sebelum disimpan ke PostgreSQL.
* **Rate Limiting**: Rate limit maksimal 100 requests per menit per IP address (`@fastify/rate-limit`).
* **Storage Security**: File diupload ke direktori lokal terpisah per user ID.

---

## 7. Pola Desain & Arsitektur Utama (Design Patterns)

| Pola | Implementasi | Alasan |
| :--- | :--- | :--- |
| **Modular Monolith** | `apps/backend/src/modules/` | Memisahkan domain logika bisnis (auth, files, voice, dll.) tetapi berjalan dalam satu proses backend Node.js untuk kemudahan deployment. |
| **Monorepo** | pnpm workspaces + Turborepo | Menyederhanakan sharing tipe data/skema (`packages/shared`), database (`packages/database`), dan konfigurasi (`packages/config`). |
| **Event-Driven** | Node.js `EventBus` | Decouple interaksi antar domain modul di backend tanpa dependensi langsung. |
| **Relational Query API** | Drizzle ORM Relational Queries | Type-safety query database langsung dari TypeScript dan memudahkan query relasional kompleks. |
| **In-Memory Vector Search** | Cosine Similarity di JS | Sederhana, tidak membutuhkan resource DB tambahan seperti ChromaDB pada tahap pengembangan. |
| **Task Queue** | BullMQ + Redis | Memisahkan background processing tugas berat seperti pemrosesan audio/dokumen. |
