#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_DIR"

echo "=========================================="
echo "  Ghost Relay - Instalasi"
echo "=========================================="

# --- Cek Prasyarat ---
command -v python3 >/dev/null 2>&1 || { echo "ERROR: Python 3.12+ diperlukan"; exit 1; }
command -v node    >/dev/null 2>&1 || { echo "ERROR: Node.js 20+ diperlukan"; exit 1; }
command -v npm     >/dev/null 2>&1 || { echo "ERROR: npm diperlukan"; exit 1; }

PY_VER=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
echo "[OK] Python $PY_VER"
echo "[OK] Node $(node -v)"
echo "[OK] npm $(npm -v)"

# --- Backend: Virtualenv + Install ---
echo ""
echo ">>> Menginstall backend (Python)..."

if [ ! -d backend/.venv ]; then
    python3 -m venv backend/.venv
fi

source backend/.venv/bin/activate
pip install -q --upgrade pip
pip install -q -e backend/

# --- Auto-generate .env with secure defaults ---
cd backend
python3 -c "from app.core.env_init import ensure_env; ensure_env()"
cd "$REPO_DIR"
echo "[OK] Backend terinstall (.env auto-generated)"

# --- Frontend: Install + Build ---
echo ""
echo ">>> Menginstall frontend (Node)..."
cd frontend
npm install --silent 2>/dev/null
npm run build --silent 2>/dev/null
cd ..
echo "[OK] Frontend terbangun"

# --- Pastikan start.sh executable ---
chmod +x start.sh 2>/dev/null || true

echo ""
echo "=========================================="
echo "  ✅ Instalasi selesai!"
echo "=========================================="
echo ""
echo "  Jalankan:"
echo "    ./start.sh           → Production (backend + frontend di :8000)"
echo "    ./start.sh --dev     → Development (backend :8000 + frontend :5173)"
echo ""
echo "  Docker:"
echo "    docker compose up -d"
echo "    docker compose -f docker-compose.full.yml up -d  (dengan PostgreSQL+Redis)"
echo ""

# --- Opsi: Install sebagai systemd service ---
if [[ "${1:-}" == "--service" ]]; then
    echo ">>> Install sebagai systemd service..."
    INSTALL_DIR="$REPO_DIR"
    sudo sed "s|/opt/ghost-relay|$INSTALL_DIR|g" ghost-relay.service > /tmp/ghost-relay.service
    sudo cp /tmp/ghost-relay.service /etc/systemd/system/ghost-relay.service
    sudo systemctl daemon-reload
    sudo systemctl enable ghost-relay
    sudo systemctl start ghost-relay
    echo "[OK] ghost-relay service aktif"
    echo "  systemctl status ghost-relay"
fi
