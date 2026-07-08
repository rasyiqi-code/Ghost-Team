> **ARSIP** Dokumen ini adalah lanjutan desain dari fase awal. Seluruh konsep sudah diimplementasikan dalam kode aktual: Task Decomposition di `ai-classify.ts`, Multi-Chat Integration via `@chat-adapter/*` (Chat SDK). Lihat `apps/backend/src/` untuk implementasi terkini.

---

Tentu, saya akan jabarkan secara mendetail dua bagian krusial dari proyek `Ghost Relay` ini: **Dekomposisi Tugas dari Voice Note** dan **Integrasi Multi-Chat (WA/TG/Slack)**.

---

## Bagian 1: Dekomposisi Tugas dari Voice Note (Membuat LLM Output JSON yang Konsisten)

Bagian ini adalah otak dari proyek kita. Tujuannya adalah mengubah *voice note* yang berantakan menjadi data terstruktur (JSON) yang bisa langsung dieksekusi oleh sistem.

### A. Strategi Inti: Structured Output (JSON Mode)

Kunci untuk mendapatkan JSON yang konsisten dari Qwen adalah dengan menggunakan fitur **Structured Output** (atau JSON mode). Fitur ini memastikan model mengembalikan *hanya* string JSON yang valid, tanpa teks tambahan seperti ` ```json ` yang bisa merusak parser di kode kamu.

Untuk mengaktifkannya di Qwen Cloud API, ada dua syarat yang harus dipenuhi:

1.  **Set Parameter `response_format`**: Dalam body request API, setel parameter `response_format` menjadi `{"type": "json_object"}`.
2.  **Sertakan Kata "JSON" di Prompt**: Pastikan di *system message* atau *user message* kamu terdapat kata "JSON" (case-insensitive). Tanpa ini, API akan mengembalikan error.

> **Penting**: Fitur Structured Output saat ini didukung oleh banyak model Qwen, seperti seri **Qwen-Max, Qwen-Plus, Qwen-Flash**, dan Qwen-Turbo, selama bukan dalam mode *thinking* (reasoning).

### B. Desain Prompt untuk Dekomposisi Tugas

Prompt adalah kunci. Kita perlu mendesainnya dengan **schema-first**, yaitu menentukan secara persis struktur JSON yang kita inginkan. Semakin jelas dan kaku strukturnya, semakin konsisten output-nya.

**Berikut contoh prompt lengkap untuk sistem `Ghost Relay`:**

```
Sistem:
Kamu adalah asisten AI yang bertugas mengubah transkrip voice note rapat menjadi daftar tugas yang terstruktur. 
Ekstrak informasi berikut dari teks yang diberikan dan kembalikan **hanya dalam format JSON** yang valid.

Schema JSON yang harus diikuti:
{
  "ringkasan": "string, ringkasan keseluruhan voice note dalam 1-2 kalimat",
  "tanggal_deadline": "string atau null, format YYYY-MM-DD jika disebutkan",
  "daftar_tugas": [
    {
      "divisi": "string, divisi yang bertanggung jawab (backend, frontend, desain, qa, devops, atau general)",
      "deskripsi": "string, deskripsi tugas yang jelas dan ringkas",
      "prioritas": "string, salah satu dari: tinggi, sedang, rendah"
    }
  ]
}

Aturan:
- Jika sebuah field tidak disebutkan dalam teks, gunakan null.
- Jangan menambahkan fakta atau informasi yang tidak ada dalam teks.
- Kembalikan SATU objek JSON dan TIDAK ADA teks lain di luar JSON.
- Gunakan kata-kata asli dari teks sebisa mungkin.

Teks Voice Note:
{raw_text_dari_transkrip}
```

**Tips Optimasi Prompt**:
*   **Jangan ragu untuk menentukan schema secara eksplisit** di dalam prompt.
*   **Instruksikan model bagaimana menangani nilai yang hilang** (misalnya, gunakan `null`).
*   **Jika output tidak valid**, kode kamu bisa menangkap error dan mencoba memanggil API lagi dengan membawa pesan error untuk meminta perbaikan.

### C. Pseudocode End-to-End

Berikut adalah implementasi dari modul yang sudah kita bahas sebelumnya, dengan fokus pada bagian pemanggilan LLM:

```
FUNCTION process_voice_note(platform, sender, audio_file, message_id):
    # 1. Transkripsi (pake STT/Whisper)
    raw_text = call_speech_to_text(audio_file)

    # 2. Siapkan Prompt
    prompt = """
    Sistem:
    Kamu adalah asisten AI yang bertugas mengubah transkrip voice note rapat menjadi daftar tugas yang terstruktur.
    Ekstrak informasi berikut dari teks yang diberikan dan kembalikan **hanya dalam format JSON** yang valid.

    Schema JSON yang harus diikuti:
    {
      "ringkasan": "string, ringkasan keseluruhan voice note dalam 1-2 kalimat",
      "tanggal_deadline": "string atau null, format YYYY-MM-DD jika disebutkan",
      "daftar_tugas": [
        {
          "divisi": "string, divisi yang bertanggung jawab (backend, frontend, desain, qa, devops, atau general)",
          "deskripsi": "string, deskripsi tugas yang jelas dan ringkas",
          "prioritas": "string, salah satu dari: tinggi, sedang, rendah"
        }
      ]
    }

    Aturan:
    - Jika sebuah field tidak disebutkan dalam teks, gunakan null.
    - Jangan menambahkan fakta atau informasi yang tidak ada dalam teks.
    - Kembalikan SATU objek JSON dan TIDAK ADA teks lain di luar JSON.
    - Gunakan kata-kata asli dari teks sebisa mungkin.

    Teks Voice Note:
    """ + raw_text
   
    # 3. Panggil API Qwen dengan JSON mode
    response = call_qwen_api(
        model="qwen-plus", # atau qwen-flash
        messages=[
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"}  # <-- Ini kunci utamanya!
    )

    # 4. Parse response (seharusnya sudah bersih, langsung bisa di-parse)
    tasks_json = JSON.parse(response.choices[0].message.content)
    
    # 5. (Opsional) Validasi dan perbaiki jika perlu
    IF tasks_json is not valid:
        # Log error, atau coba panggil API lagi dengan instruksi perbaikan
        tasks_json = try_fix_json(tasks_json, raw_text)

    # 6. Simpan ke memori dan kembalikan hasil
    vector_store.save("VoiceNote", { "id": message_id, "raw": raw_text, ...tasks_json })
    
    RETURN {
        "summary": tasks_json.ringkasan,
        "tasks": tasks_json.daftar_tugas,
        "deadline": tasks_json.tanggal_deadline
    }
```

Dengan pendekatan ini, kamu mendapatkan data yang bersih dan konsisten, siap untuk diproses lebih lanjut.

---

## Bagian 2: Integrasi Multi-Chat (WhatsApp, Telegram, Slack)

Bagian ini adalah "tangan" dari proyek kita, yang memungkinkan `Ghost Relay` berkomunikasi dengan dunia luar. Kita akan bahas satu per satu.

### A. WhatsApp Business API

Untuk WhatsApp, kita akan menggunakan **WhatsApp Business Cloud API** resmi dari Meta. Pendekatan yang direkomendasikan adalah menggunakan **Webhook** untuk menerima pesan dan **API calls** untuk mengirim pesan.

**Alur Kerja:**
1.  **Setup**: Daftar di Meta for Developers, buat App, dapatkan `Phone Number ID` dan `Access Token`.
2.  **Menerima Pesan (Webhook)**: Meta akan mengirimkan POST request ke endpoint server kamu (misal, `/webhook/whatsapp`) setiap kali ada pesan masuk. Kamu perlu memverifikasi webhook ini dengan `Verify Token` yang kamu setel.
3.  **Mengirim Pesan**: Panggil API endpoint `https://graph.facebook.com/v23.0/{phone-number-id}/messages` dengan `Authorization: Bearer {access-token}`.

**Pilihan Library Python:**
*   **`whatsapp-sdk` (Synchronous)**: Sederhana, straightforward, cocok untuk yang tidak mau ribet dengan async.
    ```python
    from whatsapp_sdk import WhatsAppClient
    client = WhatsAppClient(phone_number_id="YOUR_ID", access_token="YOUR_TOKEN")
    response = client.messages.send_text(to="+62812...", body="Halo dari Ghost Relay!")
    ```
*   **`py-whatsapp-cloudbot` (Asynchronous)**: Lebih powerful, berbasis `asyncio`, dan desainnya mirip dengan `python-telegram-bot`, cocok untuk aplikasi skala besar.

### B. Telegram Bot API

Telegram adalah yang paling mudah dan developer-friendly.

**Alur Kerja:**
1.  **Setup**: Bicaralah dengan @BotFather di Telegram untuk membuat bot baru dan dapatkan `API Token`.
2.  **Menerima Pesan (Webhook)**: Setel webhook dengan memanggil `https://api.telegram.org/bot{TOKEN}/setWebhook?url={YOUR_URL}/webhook/telegram`.
3.  **Mengirim Pesan**: Panggil `https://api.telegram.org/bot{TOKEN}/sendMessage?chat_id={CHAT_ID}&text={MESSAGE}`.

**Pilihan Library Python:**
*   **`python-telegram-bot`**: Library paling populer dan komprehensif. Sangat memudahkan dengan handler dan fitur-fitur lainnya.
    ```python
    from telegram import Update
    from telegram.ext import Application, CommandHandler, ContextTypes
    
    # Setup dengan token
    application = Application.builder().token("YOUR_TOKEN").build()
    
    # Cara mengirim pesan
    await context.bot.send_message(chat_id=update.effective_chat.id, text="Halo dari Ghost Relay!")
    ```

### C. Slack API

Slack menggunakan pendekatan berbasis **App** dengan OAuth.

**Alur Kerja:**
1.  **Setup**: Buat Slack App di `api.slack.com/apps`. Dapatkan **Bot Token** (`xoxb-...`) dan **App-Level Token** (`xapp-...`).
2.  **Menerima Pesan (Socket Mode)**: Untuk kemudahan pengembangan, Slack menyediakan **Socket Mode**. Ini membuat app-mu terhubung via WebSocket, jadi tidak perlu setup webhook publik (cocok untuk development).
3.  **Mengirim Pesan**: Gunakan `WebClient` dari SDK untuk memanggil method `chat_postMessage`.

**Pilihan Library Python:**
*   **`Bolt for Python`**: Framework resmi dari Slack yang sangat memudahkan.
    ```python
    from slack_bolt import App
    from slack_bolt.adapter.socket_mode import SocketModeHandler
    
    # Init app dengan token
    app = App(token="xoxb-...", socket_mode_client=SocketModeHandler("xapp-..."))
    
    # Cara mengirim pesan
    @app.event("app_mention")
    def handle_mention(event, say):
        say("Halo dari Ghost Relay!")
    ```

---

### D. Strategi Integrasi: The Orchestrator Pattern

Daripada mengintegrasikan ketiganya secara manual, kita akan menggunakan pola **Orchestrator**. Sebuah modul pusat (`Orchestrator`) akan mengatur semua komunikasi.

**Pseudocode Konsep:**

```
CLASS Orchestrator:
    - whatsapp_client
    - telegram_bot
    - slack_app
    
    FUNCTION start():
        # Register semua webhook handlers ke satu endpoint
        app.route('/webhook/whatsapp')(self.handle_whatsapp)
        app.route('/webhook/telegram')(self.handle_telegram)
        # Slack pake socket mode, jalan di background
        
    FUNCTION handle_whatsapp(request):
        data = request.json
        # Parse data WhatsApp, ekstrak pengirim dan pesan
        sender = data['entry'][0]['changes'][0]['value']['messages'][0]['from']
        message = data['entry'][0]['changes'][0]['value']['messages'][0]['text']['body']
        # Kirim ke fungsi pemrosesan utama kita (Modul 1)
        self.process_incoming_message(platform="whatsapp", sender=sender, content=message)
        return "OK"
        
    FUNCTION handle_telegram(update):
        # Parse data Telegram
        sender = update['message']['from']['id']
        message = update['message']['text']
        self.process_incoming_message(platform="telegram", sender=sender, content=message)

    # ... dan seterusnya untuk Slack

    FUNCTION send_message_to_platform(platform, recipient, message):
        IF platform == "whatsapp":
            self.whatsapp_client.messages.send_text(to=recipient, body=message)
        ELIF platform == "telegram":
            self.telegram_bot.send_message(chat_id=recipient, text=message)
        ELIF platform == "slack":
            self.slack_app.client.chat_postMessage(channel=recipient, text=message)
```

Dengan arsitektur ini, **Modul 1 (Incoming Message Router)** dari `Ghost Relay` hanya perlu berkomunikasi dengan `Orchestrator`, tanpa peduli dari platform mana pesan itu berasal atau akan dikirim ke mana. Ini membuat kode tetap bersih dan mudah dikelola.

---

Semoga dokumentasi ini cukup komprehensif untuk kamu mulai implementasi. Jika ada bagian yang perlu diperdalam, beri tahu saya.
