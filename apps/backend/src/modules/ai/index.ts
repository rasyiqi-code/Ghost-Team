import type { FastifyInstance } from 'fastify'
import {
  handleGetProviders,
  handleCreateProvider,
  handleUpdateProvider,
  handleDeleteProvider,
  handleGetProviderModels,
  handleBrowseModels,
  handleBrowseProviders,
  handleBrowseProviderModels,
  handleTestProvider
} from './handlers.js'
import { handleStreamChat } from './stream.js'

export async function aiModule(app: FastifyInstance): Promise<void> {
  // Vite dev proxy may forward Content-Type with varied casing/params.
  // Register our own JSON parser for all POST routes.
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    try {
      done(null, JSON.parse(body as string))
    } catch (err) {
      done(err as Error, undefined)
    }
  })

  app.get('/ai/providers', { preHandler: [app.authenticate] }, handleGetProviders)
  app.post('/ai/providers', { preHandler: [app.authenticate] }, handleCreateProvider)
  app.put('/ai/providers/:id', { preHandler: [app.authenticate] }, handleUpdateProvider)
  app.delete('/ai/providers/:id', { preHandler: [app.authenticate] }, handleDeleteProvider)

  app.get('/ai/providers/models', { preHandler: [app.authenticate] }, handleGetProviderModels)
  app.get('/ai/models/browse', { preHandler: [app.authenticate] }, handleBrowseModels)
  app.get('/ai/providers/browse', { preHandler: [app.authenticate] }, handleBrowseProviders)
  app.get('/ai/providers/browse/:id/models', { preHandler: [app.authenticate] }, handleBrowseProviderModels)
  app.post('/ai/providers/test', { preHandler: [app.authenticate] }, handleTestProvider)

  // Streaming endpoint — konsumsi dengan useChat() dari 'ai/react' di frontend
  app.post('/ai/chat/stream', {
    preHandler: [app.authenticate],
  }, handleStreamChat)
}
