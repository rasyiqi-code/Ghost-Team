Sempurna! Berikut **PRD (Product Requirements Document)** lengkap untuk produk **"Ghost Relay"** (atau kamu bisa ganti namanya nanti). 

Saya kosongkan semua tech stack sesuai permintaanmu. Fokusnya murni ke **masalah, alur, dan fitur**—biar kamu tinggal eksekusi dengan tools apa pun yang kamu suka nanti.

---

# PRD - Ghost Relay: Jembatan Koordinasi Tim
**Versi:** 1.0  
**Tujuan:** Hackathon Qwen Cloud (Track 1 & 4 Hybrid)  
**Konsep Utama:** Human → AI → Human (AI sebagai perantara komunikasi antar anggota tim)

---

## 1. Ringkasan Eksekutif (Executive Summary)
**Ghost Relay** adalah sistem komunikasi asinkron berbasis AI yang bertindak sebagai **"Penerjemah & Pengorganisir"** di tengah-tengah tim. Produk ini mengintegrasikan seluruh platform chat (WhatsApp, Telegram, Slack) ke dalam satu antarmuka. Tugas utamanya adalah:
1. Mengubah voice note menjadi teks terstruktur.
2. Memecah instruksi panjang menjadi tugas per divisi.
3. Mengindeks semua dokumen/file yang dikirim agar mudah dicari tanpa scroll.
4. Menjawab pertanyaan berulang secara otomatis menggunakan memori tim.

**Value Proposition:** Menghemat 70% waktu koordinasi tim dengan mengeliminasi kebiasaan scroll chat, dengar voice note, dan tanya jawab berulang.

---

## 2. Problem Statement (Masalah yang Dipecahkan)
- **Fragmented Communication:** Tim menggunakan 3+ platform berbeda (WA, TG, Slack) sehingga informasi tercecer.
- **Voice Note Fatigue:** Banyaknya voice note panjang yang harus didengarkan membuang waktu dan mengganggu fokus saat bekerja di PC.
- **Lost Context:** Dokumen/file yang sudah dikirim sulit ditemukan karena harus scroll ke atas berkali-kali.
- **Repetitive Questions:** Pertanyaan yang sama sering diajukan oleh anggota baru atau orang yang lupa, membuat anggota lain kesal harus menjawab ulang.
- **Asynchronous Breakdown:** Tidak semua perusahaan paham cara kerja remote/async, sehingga koordinasi terasa kacau.

---

## 3. Tujuan & Sasaran (Goals)
- **Tujuan Utama:** Menciptakan satu titik masuk (single source of truth) untuk semua komunikasi tim.
- **Sasaran Pengguna:** Tim teknis (programmer, desainer, product manager) yang lelah dengan koordinasi manual.
- **Metrik Keberhasilan:**
  - Waktu yang dibutuhkan untuk mencari dokumen lama berkurang dari 5 menit menjadi < 10 detik.
  - 100% voice note yang masuk otomatis ter-transkrip dan ter-ringkas.
  - Mengurangi pertanyaan berulang hingga 90% melalui fitur auto-reply berbasis memori.

---

## 4. User Persona (Pengguna Utama)
| Nama | Peran | Pain Point | Harapan ke Ghost Relay |
| :--- | :--- | :--- | :--- |
| **Andi** | Backend Engineer (Si Teknis) | Males buka HP, males dengerin voice note, gak suka scroll chat. | Bisa mengirim/menerima pesan via UI PC tanpa buka HP, dan semua voice note berubah jadi teks. |
| **Budi** | Project Manager | Sering ngirim instruksi panjang lewat voice note, dan jengkel karena tim selalu nanya ulang. | Cukup ngomong 1 kali, AI yang memecah tugas dan mengingatkan tim otomatis. |
| **Citra** | Frontend Engineer | Sering ketinggalan info karena pesan di WA, sedangkan diskusi teknis di Slack. | Semua pesan dari semua platform masuk dalam 1 feed chat yang rapi. |

---

## 5. User Stories (Skenario Penggunaan)
1. **Sebagai Andi**, saya ingin berbicara ke mikrofon di UI PC, dan pesan saya otomatis terkirim ke grup WhatsApp tim tanpa saya harus menyentuh HP.
2. **Sebagai Budi**, saya ingin mengirim voice note panjang, dan Ghost Relay otomatis memecah instruksi saya menjadi "Tugas untuk Backend" dan "Tugas untuk Frontend" di chat.
3. **Sebagai Citra**, saya ingin bertanya *"URL staging apa ya?"* dan Ghost Relay langsung menjawab dengan referensi chat lama tanpa harus saya tanyakan ke teman.
4. **Sebagai seluruh tim**, saya ingin semua file PDF/Gambar yang dikirim di chat otomatis muncul di panel samping (Side Panel) yang sudah terkelompok berdasarkan folder (misal: Desain, Dokumen Teknis, Kontrak).

---

## 6. Fitur Fungsional (Functional Requirements)

### 6.1. Universal Inbox (Aggregator Chat)
- Sistem mampu **membaca dan mengirim** pesan ke 3 platform: WhatsApp, Telegram, dan Slack.
- Semua pesan masuk dari 3 platform tersebut **disatukan** dalam satu feed chat utama di UI (tampak seperti satu grup besar).

### 6.2. Main Chat Interface (UI Tengah)
- Menampilkan riwayat percakapan kronologis dari semua platform.
- Setiap pesan diberi **label asal platform** (misal: `[WA]`, `[TG]`, `[SLACK]`) dan nama pengirim.
- Ada fitur **"Search"** untuk mencari isi chat berdasarkan kata kunci.

### 6.3. Smart Voice Note Processing (Fitur Pembunuh)
- Saat voice note terdeteksi masuk (dari WA atau TG), AI secara otomatis:
  - **Transkripsi** voice note menjadi teks (menggunakan ASR/Whisper).
  - **Ringkasan** teks panjang menjadi 1-2 kalimat inti.
  - **Decomposition**: Jika instruksi mengandung perintah untuk > 1 divisi, AI memecahnya menjadi beberapa kartu tugas terpisah.
- *Contoh Output:* `[Ringkasan Voice Note - Budi]: "Backend: update schema. Frontend: perbaiki padding. Deadline: H+2."`

### 6.4. Side Panel - Knowledge Vault (Panel Samping Kanan)
- Otomatis mengekstrak semua **file** (gambar, PDF, Word, Excel, link Drive) yang dikirim di chat.
- File-file ini **dikelompokkan secara otomatis** oleh AI berdasarkan konteks pembicaraan (misal: *"Folder: Kontrak Client A"*, *"Folder: UI Mockup V3"*).
- Fitur **"Drag & Drop"** manual untuk upload file langsung dari PC ke panel ini (otomatis terindeks).
- Setiap file di panel bisa langsung di-*preview* atau di-download.

### 6.5. Autopilot Memory & Auto-Reply (Cegah Nanya Berulang)
- Menggunakan **memori jangka panjang** (Track 1): Semua pertanyaan dan jawaban yang pernah muncul di chat disimpan di Vector Database.
- Jika ada pengguna baru bertanya (*"API key nya apa?"*), AI akan:
  - Mencocokkan pertanyaan dengan histori chat.
  - Menampilkan jawaban dari histori tersebut langsung di chat, dilengkapi dengan **sumber** (misal: *"Menurut @Andi di chat 2 Juli lalu, API key-nya adalah XXXX"*).
  - Secara otomatis *mention* ke pengirim asli jawaban tersebut sebagai bentuk konfirmasi (*"Saya bantu jawab pakai referensi dari @Andi ya"*).

### 6.6. Voice Command Input (Mode Voice di UI)
- Di bagian bawah chat, terdapat **tombol mikrofon** besar.
- Saat ditekan dan pengguna berbicara (misal: *"Kirim ke tim desain: revisi warna menjadi biru"*), AI mengubah suara menjadi teks dan langsung mengirimkannya ke platform yang dituju (atau ke semua platform jika diperlukan).

### 6.7. Report Generation (Laporan Otomatis)
- Pengguna cukup mengetik/berbicara: *"Buat laporan harian"*.
- AI akan merangkum semua aktivitas, keputusan, dan file yang diunggah selama 24 jam terakhir, lalu menghasilkan **email/teks laporan** yang siap kopas atau kirim ke atasan.

---

## 7. Fitur Non-Fungsional (Non-Functional Requirements)
- **Real-time:** Latensi maksimal 3 detik untuk meneruskan pesan antar platform.
- **Keamanan:** Kredensial API (WA/Telegram/Slack) harus dienkripsi. Sistem tidak boleh menyimpan isi pesan secara permanen kecuali di dalam memori vektor yang dienkripsi.
- **Offline Capability (Opsional):** Untuk Track 5 (Edge), UI minimal tetap bisa menampilkan histori chat meski koneksi terputus.
- **Scalability:** Mampu menangani hingga 1000 pesan per hari untuk tim berukuran 10-50 orang.

---

## 8. Desain UI/UX (Mockup Struktur)
Kamu minta UI-nya sederhana, ini gambaran layout-nya:

```
+------------------------------------------------------------------+
|  [Logo] Ghost Relay                          [Profile] [Settings] |
+------------------------------------------------------------------+
| Sisi Kiri (Opsional) |       MAIN CHAT (Tengah)      | Sisi Kanan |
| (List Channel/       |                               | (KNOWLEDGE  |
|  Grup)               |  [WA] Andi: Halo semua...     |  VAULT)     |
|                      |  [TG] Budi: (Voice Note)      |             |
| - Project Alpha (WA) |  >>> [Ringkasan Voice Note]   | 📁 Kontrak   |
| - Dev Team (TG)      |  >>> Tugas Backend: ...       | 📁 Desain    |
| - Client (Slack)     |  >>> Tugas Frontend: ...      | 📁 Dokumen   |
|                      |  [SLACK] Citra: Oke deh.      |   [Upload+]  |
|                      |                               |             |
|                      |  [ Input Teks ] [ 🎤 Mic ]    |             |
+------------------------------------------------------------------+
```

---

## 9. Asumsi & Batasan (Assumptions & Constraints)
- **Asumsi:** Tim sudah memiliki akun di WhatsApp, Telegram, atau Slack yang bisa diintegrasikan via Bot API atau Webhook.
- **Batasan:** WhatsApp memiliki kebijakan ketat terhadap Bot (rentan kena blokir jika menggunakan library unofficial seperti `whatsapp-web.js` untuk skala besar). Untuk MVP hackathon, cukup gunakan library tersebut atau fokus ke Telegram + Slack dulu, lalu WA sebagai "nice to have".

---

## 10. Kriteria Penerimaan (Acceptance Criteria - MVP untuk Hackathon)
1. ✅ Pengguna bisa mengirim pesan teks dari UI, dan pesan berhasil sampai ke Telegram & Slack.
2. ✅ Voice note dari Telegram berhasil di-transkrip dan muncul ringkasannya di chat utama dalam < 10 detik.
3. ✅ File gambar/PDF yang dikirim di chat otomatis muncul di Side Panel "Knowledge Vault" dengan nama folder otomatis.
4. ✅ Ketika pengguna mengetik pertanyaan yang sama dengan histori, AI menjawab dengan referensi tanpa bantuan manusia.
5. ✅ Pengguna bisa menekan tombol mic di UI, berbicara, dan hasilnya terkirim sebagai pesan teks ke grup.

---

## 11. Tech Stack & Infrastruktur
**[Dikosongkan sesuai permintaan]**

PRD ini sudah mencakup semua pain point yang kamu ceritakan—dari malas dengerin voice note sampai fobia scroll chat. 
