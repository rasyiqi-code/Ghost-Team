import { generateObject } from 'ai'
import { z } from 'zod'
import { getLanguageModel } from './ai-client.js'
import { chatCompletion } from './ai-chat.js'

const VALID_FOLDERS = ['Kontrak', 'Desain', 'Dokumen_Teknis', 'Laporan', 'Lainnya'] as const

const FolderSchema = z.object({
  folder: z.enum(VALID_FOLDERS),
})

const IntentSchema = z.object({
  platform: z.string(),
  receiver: z.string(),
  message: z.string(),
})

const TaskSchema = z.object({
  ringkasan: z.string(),
  tanggal_deadline: z.string().nullable(),
  daftar_tugas: z.array(z.object({
    divisi: z.enum(['backend', 'frontend', 'desain', 'qa', 'devops', 'general']),
    deskripsi: z.string(),
    prioritas: z.enum(['tinggi', 'sedang', 'rendah']),
  })),
})

export async function classifyFolder(
  filename: string,
  chatContext: string,
  userId?: string,
): Promise<string> {
  try {
    const lm = await getLanguageModel(userId)
    if (!lm) return 'Lainnya'

    const { object } = await generateObject({
      model: lm.model,
      schema: FolderSchema,
      prompt: `Berdasarkan konteks chat berikut:\n${chatContext}\n\nDan nama file: ${filename}\nTentukan folder terbaik untuk file ini.`,
    })
    return object.folder
  } catch { /* fallback */ }
  return 'Lainnya'
}

export async function extractIntent(
  commandText: string,
  userId?: string,
): Promise<Record<string, string>> {
  try {
    const lm = await getLanguageModel(userId)
    if (!lm) return { platform: '', receiver: '', message: commandText }

    const { object } = await generateObject({
      model: lm.model,
      schema: IntentSchema,
      prompt: `Teks: ${commandText}\nEkstrak informasi platform (WhatsApp/Telegram/Slack/All), receiver, dan message.`,
    })
    return object
  } catch {
    return { platform: '', receiver: '', message: commandText, error: 'intent_extraction_failed' }
  }
}

export async function decomposeTasks(
  text: string,
  userId?: string,
): Promise<Record<string, unknown>> {
  // FP-3: hanya proses jika teks cukup panjang (≥50 chars) untuk hindari noise
  if (!text || text.length < 50) {
    return { ringkasan: '', tanggal_deadline: null, daftar_tugas: [] }
  }
  try {
    const lm = await getLanguageModel(userId)
    if (!lm) return { ringkasan: '', tanggal_deadline: null, daftar_tugas: [] }

    const { object } = await generateObject({
      model: lm.model,
      schema: TaskSchema,
      prompt: `Kamu adalah asisten AI yang bertugas mengubah transkrip voice note rapat menjadi daftar tugas terstruktur.
Jangan menambahkan fakta yang tidak ada dalam teks. Gunakan kata-kata asli dari teks sebisa mungkin.

Teks Voice Note:
${text}`,
    })
    return object
  } catch {
    return { ringkasan: '', tanggal_deadline: null, daftar_tugas: [] }
  }
}
