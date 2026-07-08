import type { FastifyInstance } from 'fastify'
import {
  handleGetMeta,
  handleGetWebhookUrls,
  handleTestPlatform,
  handleGetPlatforms,
  handleCreatePlatform,
  handleUpdatePlatform,
  handleDeletePlatform,
  handleMigratePlatforms
} from './handlers.js'

export async function platformsModule(app: FastifyInstance): Promise<void> {
  app.get('/settings/platforms/meta', handleGetMeta)
  app.get('/settings/webhook-urls', handleGetWebhookUrls)
  app.post('/settings/platforms/test', { preHandler: [app.authenticate] }, handleTestPlatform)
  app.get('/settings/platforms', { preHandler: [app.authenticate] }, handleGetPlatforms)
  app.post('/settings/platforms', { preHandler: [app.authenticate] }, handleCreatePlatform)
  app.put('/settings/platforms/:id', { preHandler: [app.authenticate] }, handleUpdatePlatform)
  app.delete('/settings/platforms/:id', { preHandler: [app.authenticate] }, handleDeletePlatform)
  app.post('/settings/platforms/migrate', { preHandler: [app.authenticate] }, handleMigratePlatforms)
}
