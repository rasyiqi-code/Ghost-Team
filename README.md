# Ghost Relay

Pusat komunikasi multi-platform + AI. Satu dashboard untuk mengelola pesan dari Telegram, WhatsApp, Slack, dan Web dengan dukungan AI (chat, voice, auto-reply, knowledge vault).

## Prasyarat

- Python 3.12+
- Node.js 20+
- PostgreSQL 16 (untuk production, opsional untuk development — fallback SQLite)

## Instalasi Cepat

```bash
./install.sh
```

Script akan menginstall backend (virtualenv + pip), membuat `.env` secara otomatis, membangun frontend, dan siap dijalankan.

## Menjalankan Secara Lokal (Development)

```bash
# Terminal 1 — Backend
cd backend
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Frontend (dev server dengan HMR)
cd frontend
npm run dev
```

Akses:
- Frontend: http://localhost:5173
- API: http://localhost:8000
- Docs: http://localhost:8000/docs

Atau dengan satu perintah:

```bash
./start.sh --dev
```

### Menggunakan PostgreSQL Lokal

```bash
# Pastikan PostgreSQL berjalan, lalu buat database
createdb ghost_relay

# Set DATABASE_URL di .env (atau export env var):
export DATABASE_URL="postgresql+asyncpg://user:password@localhost:5432/ghost_relay"
```

Tanpa set `DATABASE_URL`, sistem akan tetap menggunakan SQLite (`data/ghost_relay.db`).

## Menjalankan Secara Production

### Opsi A — Docker (recommended)

```bash
docker compose up -d
```

Akses di http://localhost:8000

Ini menjalankan:
- **PostgreSQL 16** sebagai database
- **Ghost Relay** (backend + frontend terbuild) di port 8000

Konfigurasi ada di `docker-compose.yml`. Untuk menambahkan Redis:

```bash
docker compose -f docker-compose.full.yml up -d
```

### Opsi B — Langsung di Server

```bash
# 1. Install dependencies & build
./install.sh

# 2. Atur environment variables
export DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/ghost_relay"
export JWT_SECRET_KEY="ganti-dengan-random-string"
export ENCRYPTION_KEY="ganti-dengan-random-32-byte-hex"

# 3. Jalankan migration (tabel dibuat otomatis saat startup, 
#    tapi untuk migrasi eksplisit jalankan):
cd backend
source .venv/bin/activate
alembic upgrade head

# 4. Jalankan server
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Atau:

```bash
./start.sh
```

### Opsi C — Systemd Service

```bash
./install.sh --service
```

## Environment Variables

Semua env vars dibuat otomatis di `.env` saat pertama kali `install.sh` dijalankan (atau `ensure_env()` dipanggil). Variabel utama:

| Variable | Default | Keterangan |
|----------|---------|------------|
| `DATABASE_URL` | `sqlite+aiosqlite:///./data/ghost_relay.db` | Koneksi database |
| `JWT_SECRET_KEY` | auto-generated | Secret key untuk JWT |
| `ENCRYPTION_KEY` | auto-generated | Key enkripsi data sensitif |
| `CRYPTO_SALT` | auto-generated | Salt untuk hashing |
| `ADMIN_EMAIL` | `admin@ghost.local` | Email admin untuk seeder pertama |
| `ADMIN_PASSWORD` | `admin123` | Password admin untuk seeder pertama |
| `PUBLIC_URL` | `http://localhost:8000` | URL publik untuk webhook |
| `OPENAI_API_KEY` | — | API key untuk AI provider default |
| `REDIS_URL` | — | Redis URL (kosong = task runner built-in) |

## Redis (Opsional)

Jika `REDIS_URL` tidak diset, task (voice processing, auto-reply, file indexing) berjalan di background thread pool. Untuk Redis:

```bash
export REDIS_URL="redis://localhost:6379/0"
```

## Webhook URLs

Untuk menghubungkan platform eksternal (Telegram, WhatsApp, Slack), set `PUBLIC_URL` dengan URL publik server, lalu akses halaman Settings > Connected Platforms untuk melihat endpoint webhook.

## Login Default (Seeder)

Saat pertama kali database kosong, seeder otomatis membuat:

- **Email:** `admin@ghost.local`
- **Password:** `admin123`

Jika `OPENAI_API_KEY` tersedia di `.env`, AI provider default akan otomatis ditambahkan.

## Development

### Backend

```bash
cd backend
source .venv/bin/activate
pip install -e ".[dev]"  # termasuk pytest, ruff, dll
pytest tests/ -v         # 24+ test
```

### Frontend

```bash
cd frontend
npm install
npm run dev
npm run build    # production build
```

## Stack

- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2.0 (async), PostgreSQL/SQLite, Alembic, Socket.IO
- **Frontend:** React 19, TanStack Router, TanStack Query, Tailwind v4, shadcn/ui, Socket.IO Client
- **AI:** OpenAI-compatible API (dashscope, openai, dll), ChromaDB untuk semantic memory
- **Task Runner:** Redis (opsional) atau ThreadPoolExecutor built-in
