import { db } from '@ghost/database'

export interface QueryResult {
  id: string
  content: string
  metadata: Record<string, string>
  similarity: number
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!
    normA += a[i]! ** 2
    normB += b[i]! ** 2
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

class PersistentVectorStore {
  async addChat(
    id: string,
    embedding: number[],
    document: string,
    metadata: Record<string, string>,
  ): Promise<void> {
    await db.embedding.upsert({
      where: {
        referenceId_collection: {
          referenceId: id,
          collection: 'chat_memory',
        }
      },
      update: {
        embedding: embedding as any,
        document,
        metadata: metadata as any,
      },
      create: {
        userId: metadata.userId ?? '',
        referenceId: id,
        collection: 'chat_memory',
        document,
        embedding: embedding as any,
        metadata: metadata as any,
      }
    })
  }

  async searchChat(
    queryEmbedding: number[],
    topK: number,
    where?: Record<string, string>,
  ): Promise<QueryResult[]> {
    let rows = await db.embedding.findMany({
      where: { collection: 'chat_memory' }
    })
    if (where) {
      rows = rows.filter(row => {
        const meta = (row.metadata ?? {}) as Record<string, unknown>
        return Object.entries(where).every(([k, v]) => String(meta[k]) === v)
      })
    }
    const scored = rows.map(row => ({
      id: row.referenceId,
      content: row.document,
      metadata: (row.metadata ?? {}) as Record<string, string>,
      similarity: cosineSimilarity(queryEmbedding, row.embedding as unknown as number[]),
    }))

    scored.sort((a, b) => b.similarity - a.similarity)
    return scored.slice(0, topK)
  }

  async addFile(
    id: string,
    embedding: number[],
    document: string,
    metadata: Record<string, string>,
  ): Promise<void> {
    await db.embedding.upsert({
      where: {
        referenceId_collection: {
          referenceId: id,
          collection: 'knowledge_vault',
        }
      },
      update: {
        embedding: embedding as any,
        document,
        metadata: metadata as any,
      },
      create: {
        userId: metadata.userId ?? '',
        referenceId: id,
        collection: 'knowledge_vault',
        document,
        embedding: embedding as any,
        metadata: metadata as any,
      }
    })
  }

  async searchVault(
    queryEmbedding: number[],
    topK: number,
    where?: Record<string, string>,
  ): Promise<QueryResult[]> {
    let rows = await db.embedding.findMany({
      where: { collection: 'knowledge_vault' }
    })
    if (where) {
      rows = rows.filter(row => {
        const meta = (row.metadata ?? {}) as Record<string, unknown>
        return Object.entries(where).every(([k, v]) => String(meta[k]) === v)
      })
    }
    const scored = rows.map(row => ({
      id: row.referenceId,
      content: row.document,
      metadata: (row.metadata ?? {}) as Record<string, string>,
      similarity: cosineSimilarity(queryEmbedding, row.embedding as unknown as number[]),
    }))

    scored.sort((a, b) => b.similarity - a.similarity)
    return scored.slice(0, topK)
  }
}

export const memoryStore = new PersistentVectorStore()
