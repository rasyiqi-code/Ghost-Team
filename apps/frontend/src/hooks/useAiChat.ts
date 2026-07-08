import { useChat } from '@ai-sdk/react'
import { TextStreamChatTransport } from 'ai'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import { useState } from 'react'
import type { ChatStatus } from 'ai'

export interface AiChatState {
  /** Kirim pesan dan mulai streaming AI response */
  sendMessage: (content: string) => void
  /** Konten yang sedang di-streaming dari AI */
  streamingContent: string
  /** Status streaming: 'ready' | 'submitted' | 'streaming' | 'error' */
  status: ChatStatus
  /** Apakah sedang dalam proses streaming */
  isStreaming: boolean
  /** Hentikan streaming */
  stop: () => void
  /** Nama-nama file dari Knowledge Vault yang digunakan sebagai konteks RAG */
  ragSources: string[]
}

interface FileSearchResult {
  id: number
  originalName: string
  extractedText?: string
}

/**
 * Cari Knowledge Vault untuk konteks relevan.
 * Mengembalikan teks yang sudah diperkaya + daftar sumber file.
 */
async function enrichWithRagContext(content: string): Promise<{ text: string; sources: string[] }> {
  try {
    const results = await api.post<FileSearchResult[]>('/files/search', {
      query: content,
      limit: 5,
    })

    if (Array.isArray(results) && results.length > 0) {
      const withText = results.filter((r) => r.extractedText)
      if (withText.length > 0) {
        const sources = withText.map((r) => r.originalName)
        const snippets = withText.map((r) => `[${r.originalName}]: ${r.extractedText}`).join('\n\n')
        return {
          text: [
            'Berikut informasi dari Knowledge Vault yang relevan dengan pertanyaan:',
            snippets,
            '---',
            `Pertanyaan: ${content}`,
          ].join('\n\n'),
          sources,
        }
      }
    }
  } catch {
    // Gagal search — lanjut tanpa RAG
  }
  return { text: content, sources: [] }
}

/**
 * Hook untuk streaming AI chat via Vercel AI SDK v4.
 * Sebelum mengirim pesan, lakukan RAG: search Knowledge Vault dulu
 * lalu prepend hasilnya sebagai konteks ke AI.
 * Setelah streaming selesai, onFinish(options) dipanggil dengan konten AI response.
 */
export function useAiChat(options?: {
  onFinish?: (content: string) => void
}): AiChatState {
  const token = useAuthStore((s) => s.token)
  const [ragSources, setRagSources] = useState<string[]>([])

  const transport = new TextStreamChatTransport({
    api: '/api/ai/chat/stream',
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},
  })

  const { sendMessage: chatSend, messages, status, stop } = useChat({
    transport,
    onFinish: (result) => {
      // Ekstrak teks dari parts pesan assistant terakhir
      const text = result.message.parts
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('')
      options?.onFinish?.(text || '')
    },
  })

  // Ambil konten dari pesan assistant terakhir (yang sedang di-stream)
  const assistantMessages = messages.filter((m) => m.role === 'assistant')
  const lastAssistant = assistantMessages[assistantMessages.length - 1]
  const streamingContent = lastAssistant?.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('') ?? ''

  const isStreaming = status === 'submitted' || status === 'streaming'

  const sendMessage = async (content: string) => {
    const { text: enriched, sources } = await enrichWithRagContext(content)
    setRagSources(sources)
    chatSend({ text: enriched })
  }

  return { sendMessage, streamingContent, status, isStreaming, stop, ragSources }
}
