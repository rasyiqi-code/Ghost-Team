#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_DIR"

echo "=========================================="
echo "  Ghost Relay - Instalasi"
echo "=========================================="
echo ""

# ── Cek Prasyarat ────────────────────────────────────────
command -v node >/dev/null 2>&1 || { echo "ERROR: Node.js 22+ diperlukan — https://nodejs.org"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "ERROR: pnpm 9+ diperlukan — npm install -g pnpm"; exit 1; }

NODE_VER=$(node -v)
PNPM_VER=$(pnpm -v)
echo "  ✅ Node.js $NODE_VER"
echo "  ✅ pnpm v$PNPM_VER"
echo ""

# ── Install dependencies ─────────────────────────────────
echo ">>> Menginstall dependencies..."
pnpm install
echo "  ✅ Dependencies terinstall"
echo ""

# ── Generate Prisma client ──────────────────────────────
echo ">>> Generate Prisma client..."
pnpm db:generate 2>/dev/null || echo "  ⚠ Prisma generate skipped (butuh database)"
echo ""

# ── Setup .env ──────────────────────────────────────────
if [ ! -f .env ]; then
    echo ">>> Membuat .env dengan default development..."
    cat > .env <<- 'EOF'
DATABASE_URL=postgresql://ghost:changeme@localhost:5432/ghost_relay
REDIS_URL=
ENVIRONMENT=development
HOST=0.0.0.0
PORT=8000
JWT_SECRET_KEY=dev-secret-key-change-in-production
ENCRYPTION_KEY=dev-encryption-key-change-in-production-32char
CRYPTO_SALT=dev-crypto-salt-change-in-production
ADMIN_EMAIL=admin@ghost.local
ADMIN_PASSWORD=admin123
CORS_ORIGINS=["*"]
STORAGE_DIR=/tmp/ghost-storage
EOF
    echo "  ✅ .env dibuat (ganti secret keys untuk production)"
else
    echo "  ⚠ .env sudah ada, dilewati"
fi
echo ""

# ── Selesai ──────────────────────────────────────────────
echo "=========================================="
echo "  ✅ Instalasi selesai!"
echo "=========================================="
echo ""
echo "  Sebelum menjalankan, pastikan PostgreSQL berjalan."
echo "  Untuk development dengan Docker:"
echo "    docker compose up -d db"
echo ""
echo "  Jalankan:"
echo "    pnpm dev               → Development (backend :8000 + frontend :5173)"
echo "    pnpm build             → Build production"
echo "    pnpm --filter @ghost/backend start  → Backend production"
echo ""
echo "  Login default:"
echo "    Email:    admin@ghost.local"
echo "    Password: admin123"
echo ""
