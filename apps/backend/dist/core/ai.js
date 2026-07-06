import OpenAI from 'openai';
import { db } from '@ghost/database';
import { decrypt } from './encryption.js';
const clientCache = new Map();
function makeClient(apiKey, baseURL) {
    const key = `${apiKey}:${baseURL}`;
    if (!clientCache.has(key)) {
        clientCache.set(key, new OpenAI({ apiKey, baseURL }));
    }
    return clientCache.get(key);
}
async function getActiveProvider(providerType, userId) {
    if (userId) {
        try {
            const provider = await db.aIProvider.findFirst({
                where: {
                    userId,
                    providerType,
                    isActive: true,
                },
            });
            if (provider) {
                return {
                    apiKey: decrypt(provider.apiKey),
                    baseURL: provider.apiBaseUrl,
                    modelId: provider.modelId,
                };
            }
        }
        catch { /* noop */ }
    }
    return null;
}
export async function chatCompletion(model, messages, options) {
    const provider = await getActiveProvider('chat', options?.userId);
    if (!provider)
        throw new Error('No AI provider configured for chat');
    const client = makeClient(provider.apiKey, provider.baseURL);
    const modelId = model || provider.modelId;
    const result = await client.chat.completions.create({
        model: modelId,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: options?.temperature ?? 0.3,
        ...(options?.responseFormat ? { response_format: options.responseFormat } : {}),
    });
    return result.choices[0]?.message?.content ?? '';
}
export async function transcribeAudio(audioPath, userId) {
    const provider = await getActiveProvider('audio', userId);
    if (!provider)
        throw new Error('No AI provider configured for audio');
    const client = makeClient(provider.apiKey, provider.baseURL);
    const fs = await import('node:fs');
    const result = await client.audio.transcriptions.create({
        model: provider.modelId,
        file: fs.createReadStream(audioPath),
    });
    return result.text ?? '';
}
export async function generateEmbedding(text, userId) {
    const provider = await getActiveProvider('embedding', userId);
    if (!provider)
        throw new Error('No AI provider configured for embedding');
    const client = makeClient(provider.apiKey, provider.baseURL);
    const result = await client.embeddings.create({
        model: provider.modelId,
        input: text,
    });
    return result.data[0]?.embedding ?? [];
}
export async function summarizeText(text, userId) {
    return chatCompletion('', [
        { role: 'user', content: `Ringkas teks berikut menjadi maksimal 2 kalimat inti:\n\n${text}` },
    ], { temperature: 0.3, userId });
}
export async function decomposeTasks(text, userId) {
    try {
        const content = await chatCompletion('', [
            {
                role: 'user',
                content: `Kamu adalah asisten AI yang bertugas mengubah transkrip voice note rapat menjadi daftar tugas yang terstruktur.
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
${text}`,
            },
        ], { temperature: 0.2, responseFormat: { type: 'json_object' }, userId });
        return JSON.parse(content);
    }
    catch {
        return { ringkasan: '', tanggal_deadline: null, daftar_tugas: [] };
    }
}
export async function generateAutoReply(question, context, userId) {
    const contextText = context.length ? context.join('\n---\n') : 'Tidak ada konteks.';
    return chatCompletion('', [
        {
            role: 'user',
            content: `Berdasarkan konteks percakapan tim berikut, jawab pertanyaan user.
Jawab singkat dan to the point. Sebutkan sumber jika ada.

Konteks:
${contextText}

Pertanyaan: ${question}

Jawaban:`,
        },
    ], { temperature: 0.3, userId });
}
export async function classifyFolder(filename, chatContext, userId) {
    try {
        const answer = await chatCompletion('', [
            {
                role: 'user',
                content: `Berdasarkan konteks chat berikut:\n${chatContext}\n\nDan nama file: ${filename}\nTentukan folder terbaik untuk file ini. Pilih HANYA SATU dari: Kontrak, Desain, Dokumen_Teknis, Laporan, Lainnya\nBalas hanya dengan nama folder, tanpa penjelasan.`,
            },
        ], { temperature: 0.1, userId });
        const valid = ['Kontrak', 'Desain', 'Dokumen_Teknis', 'Laporan', 'Lainnya'];
        for (const v of valid) {
            if (answer.toLowerCase().includes(v.toLowerCase()))
                return v;
        }
    }
    catch { /* fallback */ }
    return 'Lainnya';
}
export async function extractIntent(commandText, userId) {
    try {
        const content = await chatCompletion('', [
            {
                role: 'user',
                content: `Teks: ${commandText}
Ekstrak informasi berikut dan kembalikan dalam format JSON:
{
  "platform": "WhatsApp, Telegram, Slack, atau All",
  "receiver": "nama grup atau penerima",
  "message": "isi pesan yang akan dikirim"
}
Kembalikan SATU objek JSON dan TIDAK ADA teks lain di luar JSON.`,
            },
        ], { responseFormat: { type: 'json_object' }, temperature: 0.2, userId });
        return JSON.parse(content);
    }
    catch {
        return { platform: '', receiver: '', message: commandText, error: 'intent_extraction_failed' };
    }
}
export async function listAvailableModels(userId) {
    const providers = [];
    for (const ptype of ['chat', 'embedding', 'audio']) {
        const p = await getActiveProvider(ptype, userId);
        if (p)
            providers.push({ apiKey: p.apiKey, baseURL: p.baseURL });
    }
    const seen = new Set();
    const results = [];
    for (const p of providers) {
        try {
            const client = makeClient(p.apiKey, p.baseURL);
            const models = await client.models.list();
            for (const m of models.data) {
                const key = `${p.baseURL}:${m.id}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    results.push({ id: m.id, providerBaseURL: p.baseURL, ownedBy: m.owned_by ?? '' });
                }
            }
        }
        catch { /* skip */ }
    }
    return results.sort((a, b) => a.id.localeCompare(b.id));
}
//# sourceMappingURL=ai.js.map