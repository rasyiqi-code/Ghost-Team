# Panduan Deployment ke Alibaba Cloud ECS 🚀

Dokumen ini menjelaskan langkah-langkah komprehensif untuk mendeploy aplikasi **Ghost Relay** ke instans Alibaba Cloud ECS (Elastic Compute Service).

---

## 🏗️ 1. Persiapan Instans ECS (Alibaba Cloud)

1. **Pilih Sistem Operasi**: 
   - Gunakan **Ubuntu 22.04 LTS** atau **Debian 11/12** (Arsitektur x86_64).
2. **Spesifikasi Rekomendasi**:
   - Minimum: 2 vCPU, 2 GB RAM (Tipe Uji Coba Gratis / Free Trial atau ecs.g6 / ecs.c6).
3. **Aturan Security Group (Firewall)**:
   - Tambahkan aturan masuk (*Inbound Rules*) berikut pada Security Group ECS Anda:
     | Port | Protokol | Sumber | Keterangan |
     |------|----------|--------|------------|
     | `22` | TCP | `0.0.0.0/0` | Akses SSH |
     | `80` | TCP | `0.0.0.0/0` | HTTP (Certbot & Nginx) |
     | `443` | TCP | `0.0.0.0/0` | HTTPS (Nginx SSL) |
     | `8000` | TCP | `0.0.0.0/0` | Akses Aplikasi (Opsional) |

---

## 🔑 2. Dapatkan API Key Qwen Cloud (DashScope)

Ghost Relay terintegrasi secara bawaan dengan ekosistem model AI Qwen milik Alibaba Cloud:
1. Masuk ke **[Alibaba Cloud DashScope Console](https://dashscope.console.aliyun.com/)**.
2. Buat API Key baru.
3. API Key ini akan dimasukkan sebagai nilai `DASHSCOPE_API_KEY` dan `OPENAI_API_KEY` pada file `.env`.

---

## ⚡ 3. Jalankan Otomasi Script Deployment

Kami telah menyediakan script `deploy-aliyun.sh` untuk mengotomatisasi seluruh proses setup (instalasi Docker, klon repositori, pembuatan env, setup firewall, dan startup).

1. Hubungkan ke ECS Anda via SSH:
   ```bash
   ssh root@<IP_PUBLIC_ECS>
   ```
2. Unduh dan jalankan script:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/rasyiqi-code/Ghost-Team/master/deploy-aliyun.sh -o deploy-aliyun.sh
   # Atau jika Anda sudah meng-clone repo secara manual:
   # sudo bash /opt/ghost-relay/deploy-aliyun.sh
   
   sudo bash deploy-aliyun.sh
   ```
3. Script akan meminta Anda memasukkan **URL Repositori GitHub**, **Email Admin**, dan **Qwen API Key (DashScope)** Anda.

---

## 🔒 4. Setup Domain & HTTPS (Sangat Penting untuk Webhook)

Agar integrasi webhook Telegram, WhatsApp, dan Slack dapat berfungsi, server Anda **harus** memiliki sertifikat SSL yang valid (HTTPS).

### Langkah A: Arahkan Domain Anda
Arahkan domain/subdomain Anda (misal `ghost.domainanda.com`) ke IP Publik ECS Anda melalui DNS Manager (Alibaba Cloud DNS atau Cloudflare) dengan membuat **A Record**.

### Langkah B: Instalasi Nginx dan Certbot
1. Instal Nginx dan Certbot di host ECS:
   ```bash
   sudo apt update
   sudo apt install -y nginx certbot python3-certbot-nginx
   ```
2. Konfigurasikan block Nginx `/etc/nginx/sites-available/ghost-relay`:
   ```nginx
   server {
       listen 80;
       server_name ghost.domainanda.com; # Ganti dengan domain Anda

       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
3. Aktifkan konfigurasi dan restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/ghost-relay /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### Langkah C: Dapatkan Sertifikat SSL SSL (Let's Encrypt)
Jalankan perintah berikut untuk mengonfigurasi SSL otomatis pada Nginx:
```bash
sudo certbot --nginx -d ghost.domainanda.com
```
Ikuti instruksi di layar. Certbot akan memperbarui konfigurasi Nginx Anda secara otomatis agar mengalihkan semua lalu lintas HTTP ke HTTPS.

---

## 🛠️ 5. Manajemen & Perawatan Server

Semua perintah berikut dijalankan di dalam direktori `/opt/ghost-relay`:

- **Melihat status kontainer**:
  ```bash
  docker compose ps
  ```
- **Melihat logs secara real-time**:
  ```bash
  docker compose logs -f
  ```
- **Menghentikan aplikasi**:
  ```bash
  docker compose down
  ```
- **Melakukan pembaruan (Update Code)**:
  ```bash
  git pull
  docker compose build --no-cache
  docker compose up -d
  ```

---

## 💡 Troubleshooting

### Kontainer Gagal Start Karena Database Belum Siap
- Perilaku default docker-compose memiliki parameter `healthcheck`. Jika terjadi kegagalan, jalankan ulang dengan:
  ```bash
  docker compose restart ghost-relay
  ```

### API Key Qwen Bermasalah
- Pastikan API Key di `.env` sudah benar dan terdaftar pada region yang didukung (misalnya internasional). Periksa log backend untuk error API:
  ```bash
  docker compose logs ghost-relay | grep ai
  ```
