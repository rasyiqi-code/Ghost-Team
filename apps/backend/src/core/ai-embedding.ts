import { embed } from 'ai'
import { getEmbeddingModel } from './ai-client.js'

export async function generateEmbedding(text: string, userId?: string): Promise<number[]> {
  const em = await getEmbeddingModel(userId)
  if (!em) throw new Error('No AI provider configured for embedding')

  const { embedding } = await embed({
    model: em.model,
    value: text,
  })

  return embedding
}
