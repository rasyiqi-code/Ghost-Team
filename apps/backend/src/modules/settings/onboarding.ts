import type { FastifyRequest, FastifyReply } from 'fastify'
import { randomBytes } from 'node:crypto'
import { setSetting, invalidateCache } from '../../core/db-settings.js'
import { encrypt } from '../../core/encryption.js'
import { db } from '@ghost/database'

export async function handleOnboarding(req: FastifyRequest, reply: FastifyReply) {
  const {
    workspaceName,
    workspacePurpose,
    workspaceContext,
    aiProvider,
    aiApiKey,
    aiModel,
    aiEmbeddingModel,
    aiAudioModel,
    aiBaseUrl,
  } = req.body as any

  await setSetting('workspace_name', workspaceName || '')
  await setSetting('workspace_purpose', workspacePurpose || '')
  await setSetting('workspace_context', workspaceContext || '')

  // Buat workspace jika belum ada
  const existing = await db.workspace.findUnique({ where: { ownerId: req.userId } })
  if (!existing) {
    const inviteCode = randomBytes(16).toString('hex')
    await setSetting('workspace_invite_code', inviteCode)
    const ws = await db.workspace.create({
      data: {
        name: workspaceName || 'Ghost Relay',
        ownerId: req.userId,
        inviteCode,
      }
    })
    await db.workspaceMember.create({
      data: { workspaceId: ws.id, userId: req.userId, role: 'admin' },
    })
  }

  if (aiProvider && aiApiKey) {
    const types = ['chat', 'embedding', 'audio']
    for (const type of types) {
      const existing = await db.aIProvider.findFirst({
        where: {
          userId: req.userId,
          providerType: type
        }
      })

      let modelId = aiModel || ''
      if (type === 'embedding') {
        modelId = aiEmbeddingModel || ''
      } else if (type === 'audio') {
        modelId = aiAudioModel || ''
      }

      const payload = {
        userId: req.userId,
        providerType: type,
        name: aiProvider,
        apiBaseUrl: aiBaseUrl || '',
        apiKey: encrypt(aiApiKey),
        modelId,
        isActive: true,
        scope: 'personal' as const,
      }

      if (existing) {
        await db.aIProvider.update({
          where: { id: existing.id },
          data: payload
        })
      } else {
        await db.aIProvider.create({
          data: payload
        })
      }
    }
  }

  invalidateCache()
  return { status: 'ok' }
}
