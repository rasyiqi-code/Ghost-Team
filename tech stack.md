# PRD - Tech Stack (Ghost Relay)

**Dokumen ini adalah lampiran teknis dari PRD utama Ghost Relay.** Berisi spesifikasi lengkap teknologi yang akan digunakan untuk membangun produk.


## 1. Ringkasan Arsitektur

Ghost Relay dibangun dengan arsitektur **full-stack terpisah (decoupled)** :

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                         │
│                  Web App (React + TanStack)                    │
│                         (Vite / SPA)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ WebSocket + REST API
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND API (FastAPI)                     │
│              ┌─────────────────────────────────────┐           │
│              │     Background Task Queue (Celery)  │           │
│              └─────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐
│   PostgreSQL    │ │    ChromaDB     │ │  Qwen Cloud API         │
│   (Data Utama)  │ │   (Vector DB)   │ │  (LLM + Speech-to-Text) │
└─────────────────┘ └─────────────────┘ └─────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│              EXTERNAL PLATFORMS (Webhook/Socket)               │
│         WhatsApp │ Telegram │ Slack                            │
└─────────────────────────────────────────────────────────────────┘
```


## 2. Frontend Stack

### 2.1. Core Framework

| Komponen | Pilihan | Alasan |
| :--- | :--- | :--- |
| **UI Library** | React 19 | Ekosistem terbesar, kompatibel penuh dengan TanStack, dukungan React Compiler stabil  |
| **Bahasa** | TypeScript 5.x | Type safety end-to-end, error tertangkap sebelum runtime  |
| **Build Tool** | Vite | Super cepat, HMR instan, lebih ringan dari Webpack |

### 2.2. TanStack Ecosystem (Inti)

| Tool | Versi | Fungsi | Alasan |
| :--- | :--- | :--- | :--- |
| **TanStack Router** | Latest | Routing type-safe | Type safety terkuat di ekosistem React. Routes, params, search parameters fully typed. TypeScript menangkap error routing sebelum kode jalan |
| **TanStack Query** | v5 | Server state management | Standar de facto untuk data fetching. Handle caching, background refetch, loading states, error handling otomatis. Pisahkan server state (Query) dari UI state (Zustand) |
| **TanStack Form** | Latest | Form & validasi | Headless, fleksibel. Bisa tentukan kapan validasi terjadi (onChange, onBlur, onSubmit). Integrasi native dengan Zod |
| **TanStack Table** (Opsional) | v9 | Data table | Untuk Side Panel Knowledge Vault. V9 lebih tree-shakable, memory lebih ringan |

### 2.3. State Management

| Jenis State | Tool | Alasan |
| :--- | :--- | :--- |
| **Server State** | TanStack Query | Data dari API, database, backend—butuh caching, refetch, sync |
| **Client/UI State** | Zustand | Ringan, pattern slices. Untuk state UI seperti: sidebar terbuka/tutup, current chat filter, theme |

### 2.4. UI Component & Styling

| Komponen | Pilihan | Alasan |
| :--- | :--- | :--- |
| **Component Library** | shadcn/ui | Headless, aksesibel, kustomisasi penuh. Komponen siap pakai tapi source code ada di project kita |
| **Styling** | Tailwind CSS | Utility-first, cepat, konsisten dengan shadcn/ui |
| **Icons** | Lucide React | Library icon terpopuler untuk React, ringan |

### 2.5. Real-time Communication

| Komponen | Pilihan | Alasan |
| :--- | :--- | :--- |
| **WebSocket Client** | Socket.io-client | Real-time bidirectional. Handle reconnect otomatis, fallback ke long-polling jika WebSocket tidak support |

### 2.6. Voice Input (Browser)

| Komponen | Pilihan | Alasan |
| :--- | :--- | :--- |
| **Audio Recording** | MediaRecorder API (native) | Capture microphone via browser `getUserMedia()` |
| **Audio Processing** | Kirim WAV/Opus ke backend | Backend yang handle transkripsi (via Qwen/Whisper) |


## 3. Backend Stack

### 3.1. Core Framework

| Komponen | Pilihan | Alasan |
| :--- | :--- | :--- |
| **Framework** | FastAPI (Python 3.12+) | Async-first, automatic OpenAPI docs, Pydantic v2 untuk validasi |
| **ASGI Server** | Uvicorn | High-performance ASGI server untuk production |

### 3.2. Background Task Queue

Ghost Relay punya banyak tugas berat yang **tidak boleh blocking** request-response:

- Transkripsi voice note (bisa 3-10 detik)
- Dekomposisi tugas via LLM
- Indexing file ke vector database

| Komponen | Pilihan | Alasan |
| :--- | :--- | :--- |
| **Task Queue** | Celery | Gold standard untuk background tasks di Python. Untuk tugas > 60 detik, wajib pake Celery |
| **Broker** | Redis | Ringan, cepat, support Celery |
| **Result Backend** | Redis | Menyimpan hasil task untuk diambil frontend |

**Pattern**: Endpoint FastAPI menerima request → langsung return `202 Accepted` → Celery process di background → frontend polling atau WebSocket notifikasi saat selesai

### 3.3. Real-time Communication

| Komponen | Pilihan | Alasan |
| :--- | :--- | :--- |
| **WebSocket Server** | Socket.io (via Python library `python-socketio`) | Real-time push ke frontend: pesan masuk baru, voice note selesai diproses, notifikasi |

### 3.4. External Platform Integration

| Platform | Library/Method | Alasan |
| :--- | :--- | :--- |
| **Telegram** | `python-telegram-bot` | Library paling mature, dukungan webhook + polling |
| **Slack** | `slack-bolt` (Socket Mode) | Socket Mode = tidak perlu webhook publik, cocok development |
| **WhatsApp** | WhatsApp Business Cloud API (REST) | Official Meta API. Webhook untuk inbound, REST call untuk outbound |

### 3.5. AI/LLM Integration

| Komponen | Pilihan | Alasan |
| :--- | :--- | :--- |
| **LLM API** | Qwen Cloud (via OpenAI-compatible SDK) | Base URL: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`. Bisa pake OpenAI SDK langsung |
| **Speech-to-Text** | Qwen Cloud Audio API atau Whisper (local/edge) | Transkripsi voice note |
| **Embedding** | Qwen Embedding API | Untuk semantic search di ChromaDB |

**Model yang direkomendasikan**:
- **Dekomposisi tugas**: Qwen-Plus atau Qwen-Max (butuh structured output/JSON mode)
- **Ringkasan**: Qwen-Flash (cepat, murah)
- **Auto-reply**: Qwen-Flash
- **Embedding**: Qwen embedding model

### 3.6. Database Layer

#### A. Primary Database (Structured Data)

| Komponen | Pilihan | Alasan |
| :--- | :--- | :--- |
| **Database** | PostgreSQL | Reliable, mature, support JSONB untuk fleksibilitas |
| **ORM** | SQLAlchemy 2.0 (async) | Async support, migration via Alembic |

**Schema utama**:
- `users` - user accounts, settings
- `messages` - all chat messages (platform, sender, content, timestamp)
- `platform_connections` - user's WA/TG/Slack credentials
- `files` - metadata file di Knowledge Vault
- `tasks` - hasil dekomposisi voice note

#### B. Vector Database (Memory & Semantic Search)

| Komponen | Pilihan | Alasan |
| :--- | :--- | :--- |
| **Vector DB** | ChromaDB | Open source, `pip install chromadb`. Support lokal (memory/disk). 5 menit setup. Perfect untuk MVP, nanti bisa migrasi ke production-grade |

**Fungsi ChromaDB di Ghost Relay**:
- Menyimpan embedding dari semua chat + voice note
- Semantic search untuk auto-reply (cari jawaban dari histori)
- Indexing file content untuk Knowledge Vault

### 3.7. File Storage

| Komponen | Pilihan | Alasan |
| :--- | :--- | :--- |
| **File Storage** | Cloud Storage (S3-compatible) | Untuk menyimpan file yang diupload ke Knowledge Vault |
| **Provider** | DigitalOcean Spaces atau MinIO (self-hosted) | Murah, S3-compatible |


## 4. Infrastructure & Deployment

| Komponen | Pilihan | Alasan |
| :--- | :--- | :--- |
| **Frontend Hosting** | Vercel | Deploy otomatis dari Git, CDN global, free tier cukup |
| **Backend Hosting** | Railway / Fly.io | Mudah deploy, support Docker, auto-scaling |
| **Container** | Docker + Docker Compose | Standardisasi environment, mudah pindah provider |
| **Environment Variables** | `.env` + platform secret manager | API keys, database URL, dll. |


## 5. Development Tooling

| Komponen | Pilihan | Alasan |
| :--- | :--- | :--- |
| **Package Manager** | pnpm (frontend) / pip + poetry (backend) | pnpm lebih cepat & hemat disk |
| **Linting** | ESLint + Prettier (frontend) / Ruff (backend) | Konsistensi kode |
| **Type Checking** | TypeScript (frontend) / mypy (backend) | Type safety |
| **Git Hooks** | Husky + lint-staged | Auto lint sebelum commit |
| **API Testing** | Postman / Bruno | Manual testing API |
| **Local Dev** | Docker Compose (PostgreSQL, Redis, ChromaDB) | Satu command spin up semua dependency |


## 6. Security Considerations

| Area | Pendekatan |
| :--- | :--- |
| **API Keys** | Disimpan di environment variables, never in code |
| **User Auth** | JWT-based authentication (simple, stateless) |
| **Platform Credentials** | Encrypt di database sebelum disimpan |
| **CORS** | Restricted ke frontend domain saja |
| **Rate Limiting** | Batasi request per user (mencegah abuse API Qwen) |


## 7. Ringkasan Tech Stack (TL;DR)

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | React 19 + TypeScript 5.x + Vite |
| **Routing** | TanStack Router |
| **Server State** | TanStack Query v5 |
| **Client State** | Zustand |
| **Form** | TanStack Form + Zod |
| **UI** | shadcn/ui + Tailwind CSS |
| **WebSocket Client** | Socket.io-client |
| **Backend Framework** | FastAPI (Python 3.12+) |
| **Task Queue** | Celery + Redis |
| **WebSocket Server** | python-socketio |
| **ORM** | SQLAlchemy 2.0 (async) |
| **Primary DB** | PostgreSQL |
| **Vector DB** | ChromaDB |
| **LLM** | Qwen Cloud API (OpenAI-compatible) |
| **External Chat** | WhatsApp Cloud API, python-telegram-bot, slack-bolt |
| **Frontend Hosting** | Vercel |
| **Backend Hosting** | Railway / Fly.io |
| **Container** | Docker + Docker Compose |


## 8. Catatan Penting

1. **Ghost Relay adalah SPA (Single Page Application)** , bukan SSR. TanStack Start (SSR framework) tidak diperlukan karena semua interaksi real-time via WebSocket.

2. **TanStack Router dipilih karena type safety-nya** yang jauh lebih kuat dari React Router. Routes, params, search parameters semuanya fully typed.

3. **TanStack Query vs Zustand**: Query untuk **server state** (data dari API), Zustand untuk **UI state** (sidebar toggle, filter, theme). Jangan campur.

4. **Voice note processing** harus via background task (Celery) karena bisa makan waktu 5-10 detik. Jangan blocking request-response.

5. **ChromaDB untuk MVP**—cukup untuk hackathon. Nanti bisa migrasi ke Pinecone atau Weaviate jika skala membesar.

---

Ini adalah tech stack PRD lengkap untuk Ghost Relay. Semua keputusan didasarkan pada kebutuhan fungsional produk dan tren teknologi 2026. Ada bagian yang mau didiskusikan lebih lanjut?
