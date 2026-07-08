# Load Testing — Ghost Relay

Menggunakan [k6](https://k6.io/) untuk load testing endpoint kritis.

## Prasyarat

```bash
# Install k6
# macOS:
brew install k6

# Linux (Debian/Ubuntu):
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows (winget):
winget install k6
```

## Menjalankan Test

Pastikan backend berjalan di `http://localhost:3000` (atau atur env `API_URL`):

```bash
# Test semua skenario (30 detik, 20 virtual users)
k6 run load-test/messages.js

# Test dengan durasi dan VU kustom
k6 run --duration 60s --vus 50 load-test/messages.js

# Test spesifik endpoint
k6 run load-test/ai-stream.js
```

## Skenario Test

| Script | Endpoint | Skenario |
|--------|----------|----------|
| `messages.js` | `GET /api/messages` | Fetch pesan, pagination |
| `send-message.js` | `POST /api/messages/send` | Kirim pesan |
| `ai-stream.js` | `POST /api/ai/chat/stream` | Streaming AI response |

## Thresholds

Default thresholds:
- **http_req_duration**: p95 < 2s, p99 < 5s
- **http_req_failed**: < 1%
- **iterations**: minimal 100 per VU
