Oke, kita **breakdown** arsitektur internal dan logikanya jadi **5 modul inti**. Saya tuliskan **pseudocode**-nya dalam gaya agnostik (bukan Python murni, tapi logika universal) biar kamu gampang mengimplementasikannya pakai bahasa apa pun nanti.

Kita mulai dari alur paling kritis: **Saat pesan masuk** (baik itu teks, voice note, atau file).

---

## 🔄 Modul 1: Incoming Message Router (Orchestrator Pusat)
Ini adalah "gerbang" utama. Semua pesan dari WhatsApp, Telegram, Slack masuk ke sini dulu.

**Pseudocode:**
```
FUNCTION handle_incoming_message(platform, sender, message_type, content, timestamp):
    # 1. Simpan raw message ke database/history
    message_id = save_to_database(platform, sender, message_type, content, timestamp)
    
    # 2. Tampilkan di UI Main Chat secara real-time (via WebSocket)
    send_to_ui_chat(platform, sender, message_type, content)
    
    # 3. Routing berdasarkan tipe konten (panggil modul spesifik)
    IF message_type == "voice_note":
        processed = Modul_Voice_Processor.process(platform, sender, content, message_id)
        send_to_ui_chat("SYSTEM", "Ghost Relay", "text", processed.summary)
        IF processed.has_multiple_tasks:
            FOR each task in processed.tasks:
                send_to_ui_chat("SYSTEM", "Ghost Relay (Tugas)", "text", task)
                # Opsional: kirim notifikasi ke divisi terkait di platform masing-masing
                IF task.assigned_to == "backend":
                    send_to_platform("Telegram", "@backend_team", task.description)
    
    ELIF message_type == "file" (pdf/jpg/docx):
        Modul_KnowledgeVault.index_file(content, message_id, context=previous_chat_history)
        send_to_ui_sidepanel("Knowledge Vault", "File baru terindeks: " + content.filename)
    
    ELIF message_type == "text":
        # Cek apakah ini pertanyaan yang sudah pernah dijawab (Modul Memory)
        reply = Modul_Memory_AutoReply.check_and_reply(platform, sender, content)
        IF reply.found_in_history:
            send_to_ui_chat("SYSTEM", "Ghost Relay (Memory)", "text", reply.answer + " [Referensi: " + reply.source + "]")
            # Kirim balasan otomatis ke platform asal
            send_to_platform(platform, sender, reply.answer)
    
    RETURN message_id
```

---

## 🎙️ Modul 2: Smart Voice Note Processor (Fitur Pembunuh)
Ini yang paling penting. Voice note 3 menit dipecah jadi tugas-tugas kecil.

**Pseudocode:**
```
FUNCTION process_voice_note(platform, sender, audio_file, message_id):
    # 1. Transkripsi (pake STT/Whisper)
    raw_text = call_speech_to_text(audio_file) 
    # Hasil: "Halo tim, tolong backend update schema, frontend perbaiki padding, deadline H+2"
    
    # 2. Ringkasan 1 kalimat (pake Qwen/LLM)
    summary_prompt = "Ringkas teks ini jadi maksimal 2 kalimat: " + raw_text
    summary = call_llm(summary_prompt) 
    # Hasil: "Instruksi: backend update schema, frontend perbaiki padding, deadline H+2."
    
    # 3. Dekomposisi / Pemecahan Tugas (pake Qwen/LLM dengan output terstruktur)
    decompose_prompt = """
    Teks: """ + raw_text + """
    Ekstrak daftar tugas. Format output JSON:
    [
        {"divisi": "backend", "tugas": "..."},
        {"divisi": "frontend", "tugas": "..."}
    ]
    Jika tidak ada divisi spesifik, masukkan ke "general".
    """
    tasks_json = call_llm(decompose_prompt, response_format="JSON")
    # Hasil: [{"divisi": "backend", "tugas": "update schema"}, {"divisi": "frontend", "tugas": "perbaiki padding"}]
    
    # 4. Simpan ke memori vektor (biar suatu saat bisa dicari)
    vector_store.save("VoiceNote", {
        "id": message_id,
        "raw": raw_text,
        "summary": summary,
        "tasks": tasks_json,
        "sender": sender,
        "platform": platform
    })
    
    RETURN {
        "summary": summary,
        "has_multiple_tasks": True (jika tasks_json > 1),
        "tasks": tasks_json
    }
```

---

## 🧠 Modul 3: Memory & Auto-Reply Engine (Cegah Nanya Berulang)
Ini yang membuat tim gak perlu jawab pertanyaan yang sama 10 kali.

**Pseudocode:**
```
FUNCTION check_and_reply(platform, sender, incoming_text):
    # 1. Ubah pertanyaan jadi vektor (embedding)
    query_vector = call_embedding(incoming_text)
    
    # 2. Cari di Vector Database (histori chat + voice note)
    similar_docs = vector_store.search(query_vector, top_k=3, threshold=0.75)
    # Vector store berisi semua chat lama, voice note, dan jawaban-jawaban sebelumnya.
    
    IF similar_docs is not empty:
        # Ambil jawaban yang paling relevan
        best_match = similar_docs[0]
        original_answer = best_match.get("answer") or best_match.get("summary")
        original_sender = best_match.get("sender")
        original_date = best_match.get("timestamp")
        
        # 3. Buat balasan dengan menyebutkan sumber
        reply_text = original_answer + " (Berdasarkan diskusi dengan " + original_sender + " pada " + original_date + ")"
        
        # 4. Catat bahwa ini adalah auto-reply (untuk menghindari spam)
        log_auto_reply(sender, incoming_text, reply_text)
        
        RETURN {
            "found_in_history": True,
            "answer": reply_text,
            "source": best_match.id
        }
    ELSE:
        RETURN {
            "found_in_history": False,
            "answer": None
        }
```

---

## 🗂️ Modul 4: Knowledge Vault Indexer (Side Panel File)
Semua file yang tercecer di chat otomatis rapi di samping.

**Pseudocode:**
```
FUNCTION index_file(file_object, message_id, context):
    # 1. Ekstrak teks dari file (jika PDF/Word) atau simpan metadata (jika gambar)
    IF file_object.type == "pdf":
        file_text = extract_text_from_pdf(file_object.path)
    ELIF file_object.type == "image":
        file_text = call_image_captioning(file_object.path) # deskripsi gambar via vision-llm
    ELSE:
        file_text = file_object.filename # fallback ke nama file
    
    # 2. Tentukan folder/kategori otomatis berdasarkan konteks chat (isi dari chat sebelumnya)
    folder_prompt = """
    Berdasarkan konteks chat berikut:
    """ + context + """
    Dan nama file: """ + file_object.filename + """
    Tentukan folder terbaik untuk file ini (1 kata): [Kontrak, Desain, Dokumen_Teknis, Laporan, Lainnya]
    """
    folder_name = call_llm(folder_prompt) # Output: "Desain"
    
    # 3. Simpan metadata ke database dan pindahkan file ke folder virtual
    save_file_metadata(
        file_id = generate_uuid(),
        original_name = file_object.filename,
        url = file_object.url,
        folder = folder_name,
        related_message_id = message_id
    )
    
    # 4. Trigger UI Side Panel untuk refresh
    send_to_ui_sidepanel("REFRESH_VAULT", folder_name)
    
    RETURN {"status": "indexed", "folder": folder_name}
```

---

## 🎤 Modul 5: Outgoing Voice Command (Mode Voice di UI)
Ini yang membuat kamu bisa ngomong ke PC, lalu pesan terkirim ke HP tim tanpa kamu pegang HP.

**Pseudocode:**
```
FUNCTION handle_user_voice_command(user_id, audio_input):
    # 1. Transkripsi suara user dari UI (record via browser)
    command_text = call_speech_to_text(audio_input) 
    # Hasil: "Kirim ke grup WhatsApp: Revisi warna tombol jadi hijau"
    
    # 2. Ekstrak intent dan target platform (pake LLM)
    intent_prompt = """
    Teks: """ + command_text + """
    Ekstrak:
    1. Target Platform: [WhatsApp, Telegram, Slack, All]
    2. Target Grup/Penerima: [nama grup]
    3. Isi Pesan: [teks pesan]
    Output JSON.
    """
    parsed = call_llm(intent_prompt, response_format="JSON")
    # Hasil: {"platform": "WhatsApp", "receiver": "Team A", "message": "Revisi warna tombol jadi hijau"}
    
    # 3. Kirim pesan ke platform yang dituju
    IF parsed.platform == "WhatsApp":
        send_whatsapp_message(parsed.receiver, parsed.message)
    ELIF parsed.platform == "Telegram":
        send_telegram_message(parsed.receiver, parsed.message)
    # dst...
    
    # 4. Tampilkan konfirmasi di UI Chat
    confirm_text = "[✅ Berhasil dikirim ke " + parsed.platform + " - " + parsed.receiver + "] " + parsed.message
    send_to_ui_chat("SYSTEM", "Ghost Relay (Command)", "text", confirm_text)
    
    # 5. Simpan pesan keluar ini ke memori juga (biar jadi konteks)
    save_to_memory("OUTGOING", user_id, parsed.message, parsed.platform)
    
    RETURN {"status": "sent", "platform": parsed.platform}
```

---

## 🧩 Alur Lengkap yang Menghubungkan Semua Modul
Kalau digambar secara berurutan:

1. **User A** kirim *Voice Note* di Telegram. → Masuk ke **Modul 1** → Terus ke **Modul 2**.
2. **Modul 2** pecah jadi tugas, muncul di UI Main Chat, dan otomatis **Modul 2** kirim notifikasi ke Telegram grup Backend.
3. **User B** (Backend) lihat UI, liat tugas, lalu tanya di UI (atau di Slack): *"API key nya apa?"* → Masuk **Modul 1** → Terus ke **Modul 3**.
4. **Modul 3** cek vector memory, nemu jawaban lama, langsung balas otomatis di Slack tanpa User B nunggu.
5. Sambil nunggu, **User B** drag & drop file PDF ke UI Side Panel. → Masuk **Modul 4**, otomatis terindeks dan masuk folder "Kontrak".
6. **User B** pencet tombol mic di UI, ngomong *"Kirim ke team: build sudah selesai"* → Masuk **Modul 5**, langsung terkirim ke grup WhatsApp tim. User B gak perlu buka HP sama sekali.

---

## ⚙️ Tips Eksekusi dari Pseudocode Ini
- **Untuk LLM Calls (`call_llm`)**: Kamu bisa panggil Qwen Cloud API. Karena kompatibel dengan OpenAI, kamu tinggal ganti base URL-nya.
- **Untuk Vector Store**: Di pseudocode saya panggil `vector_store.save` dan `vector_store.search`. Kamu bisa pakai ChromaDB (ringan), atau kalau males setup, bisa pake in-memory FAISS dulu buat MVP.
- **Untuk Queue (Antrian)**: Karena voice note processing bisa lama (transkripsi 5 detik), pastikan **Modul 1** menjalankan **Modul 2** secara *async* (background job) agar UI tetap responsif. Tampilkan dulu *"Processing voice note..."* di chat.

---

Pseudocode di atas sudah mencakup 100% PRD yang kita buat. Kamu tinggal konversi ke bahasa pemrograman favoritmu (Python/Go/Node.js). 

Bagian mana yang menurutmu paling tricky? Apakah bagian **dekomposisi tugas dari voice note** (soal bikin LLM output JSON yang konsisten), atau bagian **integrasi multi-chat** (WA/TG/Slack)? Saya bisa bantu perdalam salah satunya!
