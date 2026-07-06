import type { FastifyInstance } from 'fastify'
import { generateEmbedding } from '../../core/ai.js'
import { memoryStore } from '../../core/memory-store.js'
import { validate, sendValidationError, ValidationError } from '../../core/validation.js'
import { memorySearchSchema } from '@ghost/shared'

export async function memoryModule(app: FastifyInstance): Promise<void> {
  app.post('/memory/search', { preHandler: [app.authenticate] }, async (req, reply) => {
    let body: { query: string; top_k?: number }
    try {
      body = validate(memorySearchSchema, req.body)
    } catch (err) {
      if (err instanceof ValidationError) return sendValidationError(reply, err)
      throw err
    }
    const { query, top_k = 3 } = body
    const queryEmbedding = await generateEmbedding(query, req.userId)
    const matches = await memoryStore.searchChat(queryEmbedding, Math.min(top_k, 50), {
      userId: String(req.userId),
    })
    const results = matches.map(m => ({
      content: m.content,
      sender: m.metadata.sender ?? '',
      platform: m.metadata.platform ?? '',
      similarity: m.similarity,
    }))
    return { query, results }
  })
}
