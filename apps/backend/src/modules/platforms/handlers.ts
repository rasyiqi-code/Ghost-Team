import type { FastifyRequest, FastifyReply } from 'fastify'
import { db } from '@ghost/database'
import { env } from '@ghost/config'
import { encrypt, decrypt } from '../../core/encryption.js'
import { platformService } from '../../core/platform-service.js'
import { validate, sendValidationError, ValidationError } from '../../core/validation.js'
import { platformConnectionCreateSchema, platformConnectionUpdateSchema } from '@ghost/shared'
import { migratePlatformUserId } from '../../core/migrate-platform-user-id.js'
import { stopBaileys, startBaileysForUser } from '../../core/baileys-service.js'

export const PLATFORM_META = [
  { id: 'all', name: 'All Platforms', platform: 'all', label: 'ALL', color: 'bg-orange-500' },
  { id: 'wa', name: 'WhatsApp Team', platform: 'whatsapp', label: 'WA', color: 'bg-green-500' },
  { id: 'tg', name: 'Telegram Dev', platform: 'telegram', label: 'TG', color: 'bg-blue-500' },
  { id: 'sl', name: 'Slack Client', platform: 'slack', label: 'SLACK', color: 'bg-purple-500' },
  { id: 'web', name: 'Web UI', platform: 'web', label: 'WEB', color: 'bg-orange-500' },
]

export async function handleGetMeta() {
  return PLATFORM_META
}

export async function handleGetWebhookUrls(req: FastifyRequest) {
  const host = req.headers.host ?? 'localhost:8000'
  const proto = req.headers['x-forwarded-proto'] ?? 'http'
  const base = `${proto}://${host}`
  return {
    telegram: `${base}/api/webhook/telegram`,
    slack: `${base}/api/webhook/slack`,
    whatsapp: `${base}/api/webhook/whatsapp`,
  }
}

export async function handleTestPlatform(req: FastifyRequest) {
  const { platform } = req.body as { platform: string }
  const conn = await db.platformConnection.findFirst({
    where: {
      userId: req.userId,
      platform,
    },
  })
  if (conn?.credentialsEncrypted) {
    const raw = decrypt(conn.credentialsEncrypted)
    let creds: Record<string, unknown> | undefined
    try {
      creds = JSON.parse(raw) as Record<string, unknown>
    } catch {
      if (raw) creds = { botToken: raw, accessToken: raw }
    }
    if (creds) return platformService.testConnection(platform, creds as any)
  }
  return platformService.testConnection(platform)
}

export async function handleGetPlatforms(req: FastifyRequest) {
  const rows = await db.platformConnection.findMany({
    where: { userId: req.userId },
  })
  return rows
}

export async function handleCreatePlatform(req: FastifyRequest, reply: FastifyReply) {
  let body: { platform: string; credentials?: string; platform_user_id?: string }
  try {
    body = validate(platformConnectionCreateSchema, req.body)
  } catch (err) {
    if (err instanceof ValidationError) return sendValidationError(reply, err)
    throw err
  }
  const { platform, credentials, platform_user_id } = body
  const existing = await db.platformConnection.findFirst({
    where: {
      userId: req.userId,
      platform,
    },
  })
  if (existing) {
    reply.status(400).send({ detail: `Platform '${platform}' already connected` })
    return
  }
  const conn = await db.platformConnection.create({
    data: {
      userId: req.userId,
      platform,
      credentialsEncrypted: encrypt(credentials ?? ''),
      platformUserId: platform_user_id,
    }
  })

  // Otomatis daftarkan webhook ke Telegram jika platform terhubung
  let webhookStatus: string | undefined
  if (platform === 'telegram' && credentials && env.ENVIRONMENT !== 'test') {
    // Parse credentials — bisa berupa JSON atau raw token (BUG-7)
    let botToken = credentials
    try {
      const parsed = JSON.parse(credentials)
      if (parsed.botToken) botToken = parsed.botToken
    } catch { /* raw token — gunakan langsung */ }

    const host = env.PUBLIC_URL || `${req.headers['x-forwarded-proto'] ?? 'http'}://${req.headers.host ?? 'localhost:8000'}`
    const webhookUrl = `${host.replace(/\/+$/, '')}/api/webhook/telegram`

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl })
      })
      const data = (await response.json()) as { ok: boolean; description?: string }
      if (data.ok) {
        webhookStatus = 'registered'
      } else {
        webhookStatus = `failed: ${data.description ?? 'unknown error'}`
        console.error('Failed to set Telegram webhook:', webhookStatus)
      }
    } catch (e) {
      webhookStatus = `error: ${(e as Error).message}`
      console.error('Error setting Telegram webhook:', e)
    }
  }

  // Auto-start Baileys untuk WhatsApp baru
  if (platform === 'whatsapp' && env.ENVIRONMENT !== 'test') {
    try {
      await startBaileysForUser(req.userId, conn.id)
    } catch (err) {
      console.error(`[platforms] Failed to auto-start Baileys for new connection ${conn.id}:`, err)
    }
  }

  reply.status(201).send({ ...conn, webhookStatus })
}

export async function handleUpdatePlatform(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string }
  const existing = await db.platformConnection.findFirst({
    where: {
      id: Number(id),
      userId: req.userId,
    },
  })
  if (!existing) {
    reply.status(404).send({ detail: 'Platform connection not found' })
    return
  }

  let body: { platform_user_id?: string; is_active?: boolean }
  try {
    body = validate(platformConnectionUpdateSchema, req.body)
  } catch (err) {
    if (err instanceof ValidationError) return sendValidationError(reply, err)
    throw err
  }

  const updateData: Record<string, any> = {}
  if (body.platform_user_id !== undefined) {
    updateData.platformUserId = body.platform_user_id
  }
  if (body.is_active !== undefined) {
    updateData.isActive = body.is_active
  }

  if (Object.keys(updateData).length === 0) {
    reply.status(400).send({ detail: 'No fields to update' })
    return
  }

  const updated = await db.platformConnection.update({
    where: { id: Number(id) },
    data: updateData,
  })

  // Handle Baileys lifecycle untuk WhatsApp
  if (existing.platform === 'whatsapp') {
    if (body.is_active === true) {
      // Toggle aktif — auto-start Baileys
      try {
        await startBaileysForUser(existing.userId, Number(id))
      } catch (err) {
        console.error(`[platforms] Failed to start Baileys for connection ${id}:`, err)
      }
    } else if (body.is_active === false) {
      // Toggle non-aktif — stop Baileys socket
      try {
        await stopBaileys(Number(id))
      } catch (err) {
        console.error(`[platforms] Failed to stop Baileys for connection ${id}:`, err)
      }
    }
  }

  reply.send(updated)
}

export async function handleDeletePlatform(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string }
  const existing = await db.platformConnection.findFirst({
    where: {
      id: Number(id),
      userId: req.userId,
    },
  })
  if (!existing) {
    reply.status(404).send({ detail: 'Platform connection not found' })
    return
  }
  await db.platformConnection.delete({
    where: { id: Number(id) },
  })

  // Jika WhatsApp dihapus, stop Baileys socket-nya
  if (existing.platform === 'whatsapp') {
    try {
      await stopBaileys(Number(id))
    } catch (err) {
      console.error(`[platforms] Failed to stop Baileys for deleted connection ${id}:`, err)
    }
  }

  reply.send({ status: 'ok', deleted: existing.platform })
}

export async function handleMigratePlatforms(req: FastifyRequest) {
  const report = await migratePlatformUserId(req.userId)
  return {
    message: report.total === 0
      ? 'All your platform connections already have platformUserId set.'
      : `Migration complete. ${report.updated} backfilled, ${report.skipped} need manual input.`,
    report,
  }
}
