import { generateText, streamText, type ModelMessage } from 'ai'
import { getLanguageModel } from './ai-client.js'

/**
 * Generate text completion (non-streaming).
 * Pengganti client.chat.completions.create() dari openai SDK.
 */
export async function chatCompletion(
  model: string,
  messages: { role: string; content: string }[],
  options?: { temperature?: number; responseFormat?: { type: string }; userId?: string },
): Promise<string> {
  const lm = await getLanguageModel(options?.userId)
  if (!lm) throw new Error('No AI provider configured for chat')

  const coreMessages: ModelMessage[] = messages.map(m => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
  }))

  const { text } = await generateText({
    model: lm.model,
    messages: coreMessages,
    temperature: options?.temperature ?? 0.3,
  })

  return text
}

/**
 * Stream text completion — return AsyncIterable dari Vercel AI SDK.
 * Digunakan oleh endpoint SSE /api/ai/stream.
 */
export async function streamChatCompletion(
  messages: { role: string; content: string }[],
  options?: { temperature?: number; userId?: string },
): Promise<Awaited<ReturnType<typeof streamText>>> {
  const lm = await getLanguageModel(options?.userId)
  if (!lm) throw new Error('No AI provider configured for chat')

  const coreMessages: ModelMessage[] = messages.map(m => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
  }))

  return streamText({
    model: lm.model,
    messages: coreMessages,
    temperature: options?.temperature ?? 0.3,
  })
}

export async function summarizeText(text: string, userId?: string): Promise<string> {
  return chatCompletion('', [
    { role: 'user', content: `Ringkas teks berikut menjadi maksimal 2 kalimat inti:\n\n${text}` },
  ], { temperature: 0.3, userId })
}

export async function generateAutoReply(
  question: string,
  context: string[],
  userId?: string,
): Promise<string> {
  const contextText = context.length ? context.join('\n---\n') : 'Tidak ada konteks.'
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
  ], { temperature: 0.3, userId })
}
