import type { FastifyInstance } from 'fastify'
import { handleGetEnv, handlePostEnv, handleDeleteEnv } from './env.js'
import { handleOnboarding } from './onboarding.js'
import { handleFetchModels, handleModelsCatalog } from './models-catalog.js'
import {
  handleGenerateInvite, handleRegenerateInvite,
  handleGetInviteInfo, handleAcceptInvite, handleListMembers,
} from './invite.js'
import { getSetting, setSetting } from '../../core/db-settings.js'

export async function settingsModule(app: FastifyInstance): Promise<void> {
  app.get('/settings/env', { preHandler: [app.authenticate] }, handleGetEnv)
  app.post('/settings/env', { preHandler: [app.authenticate] }, handlePostEnv)
  app.delete('/settings/env/:key', { preHandler: [app.authenticate] }, handleDeleteEnv)

  app.post('/settings/onboarding', { preHandler: [app.authenticate] }, handleOnboarding)
  app.post('/settings/fetch-models', { preHandler: [app.authenticate] }, handleFetchModels)
  app.get('/settings/models-catalog', { preHandler: [app.authenticate] }, handleModelsCatalog)

  app.post('/settings/invite/generate', { preHandler: [app.authenticate] }, handleGenerateInvite)
  app.post('/settings/invite/regenerate', { preHandler: [app.authenticate] }, handleRegenerateInvite)
  app.get('/settings/invite/:code', handleGetInviteInfo)
  app.post('/settings/invite/accept', { preHandler: [app.authenticate] }, handleAcceptInvite)

  app.get('/settings/workspace', { preHandler: [app.authenticate] }, async () => {
    const name = await getSetting('workspace_name', 'Ghost Relay')
    return { name }
  })
  app.get('/settings/workspace/members', { preHandler: [app.authenticate] }, handleListMembers)

  // Auto-reply toggle
  app.get('/settings/auto-reply', { preHandler: [app.authenticate] }, async () => {
    const enabled = await getSetting('auto_reply_enabled', 'false')
    return { enabled: enabled === 'true' }
  })
  app.post('/settings/auto-reply', { preHandler: [app.authenticate] }, async (req) => {
    const { enabled } = req.body as { enabled: boolean }
    await setSetting('auto_reply_enabled', enabled ? 'true' : 'false')
    return { enabled }
  })

}
