import { generateEmbedding } from './ai-embedding.js'
import { generateAutoReply } from './ai-chat.js'
import { memoryStore, type QueryResult } from './memory-store.js'

export interface RagResult {
  hasMatch: boolean
  answer: string
  source: string
  cited: string
  context: string[]
  bestMatch: QueryResult | null
}

/**
 * Shared RAG pipeline: embed → search (chat + vault) → filter → generate.
 *
 * Semua fungsi auto-reply (triggerAutoReply, triggerBotAutoReply,
 * handleWebAiAssistantReply) menggunakan fungsi ini untuk
 * menghindari duplikasi pipeline RAG.
 *
 * Mencari di dua koleksi:
 * 1. Chat memory — histori percakapan sebelumnya
 * 2. Knowledge vault — dokumen/file yang diupload (PDF, teks, dll)
 */
export async function ragSearchAndReply(
  question: string,
  userId: string,
): Promise<RagResult> {
  const emptyResult: RagResult = {
    hasMatch: false,
    answer: '',
    source: '',
    cited: '',
    context: [],
    bestMatch: null,
  }

  try {
    const queryEmbedding = await generateEmbedding(question, userId)

    // Search BOTH collections in parallel
    const [chatMatches, vaultMatches] = await Promise.all([
      memoryStore.searchChat(queryEmbedding, 5, {
        userId: String(userId),
      }),
      memoryStore.searchVault(queryEmbedding, 5, {
        userId: String(userId),
      }),
    ])

    // Combine & filter by similarity threshold
    const allMatches = [
      ...chatMatches.map(m => ({ ...m, _source: 'chat' as const })),
      ...vaultMatches.map(m => ({ ...m, _source: 'vault' as const })),
    ]
    const filtered = allMatches
      .filter((m) => m.similarity >= 0.6)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)

    if (!filtered.length) return emptyResult

    // Build context with source labels
    const context = filtered.map((m) => {
      const prefix = m._source === 'vault'
        ? `[Knowledge Vault: ${m.metadata.filename ?? 'dokumen'}]`
        : `[Chat: ${m.metadata.sender ?? 'unknown'} di ${m.metadata.platform ?? 'unknown'}]`
      return `${prefix}\n${m.content}`
    })

    const answer = await generateAutoReply(question, context, userId)
    const best = filtered[0]!

    // Build cited sumber — prioritaskan vault
    let source: string
    if (best._source === 'vault') {
      source = `Knowledge Vault: ${best.metadata.filename ?? 'dokumen'}`
    } else {
      source = `${best.metadata.sender ?? 'unknown'} di ${best.metadata.platform ?? 'unknown'}`
    }
    const cited = `${answer}\n\n— Sumber: ${source}`

    return {
      hasMatch: true,
      answer,
      source,
      cited,
      context,
      bestMatch: best,
    }
  } catch (err) {
    console.error('[ragSearchAndReply] Error:', err)
    return emptyResult
  }
}
