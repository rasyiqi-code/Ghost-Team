import type { FastifyInstance } from 'fastify'
import type { Server as SocketIOServer } from 'socket.io'
import { db } from '@ghost/database'
import { env } from '@ghost/config'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { join } from 'node:path'
import { writeFile, mkdir } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { generateEmbedding, generateAutoReply } from '../../core/ai.js'
import { memoryStore } from '../../core/memory-store.js'
import {
  loadTelegramCredentials,
  loadWhatsAppCredentials,
  loadSlackCredentials,
} from '../../core/platform-credentials.js'

let socketIO: SocketIOServer

export async function webhookModule(app: FastifyInstance): Promise<void> {
  socketIO = app.io

  app.post('/webhook/telegram', async (req, reply) => {
    const body = req.body as Record<string, unknown>
    const update = (body.message ?? {}) as Record<string, unknown>
    const chat = (update.chat ?? {}) as Record<string, unknown>
    const sender = (update.from ?? {}) as Record<string, unknown>

    if (!chat.id) return { status: 'ignored' }

    const platformUserId = String(chat.id ?? '')

    // Load per-user Telegram credentials
    const tgCreds = await loadTelegramCredentials(platformUserId)

    // Verify webhook secret using per-user credentials
    const secretToken = req.headers['x-telegram-bot-api-secret-token']
    if (tgCreds.webhookSecret && secretToken !== tgCreds.webhookSecret) {
      reply.status(403).send({ detail: 'Invalid webhook secret' })
      return
    }

    const userId = await getUserIdForPlatform('telegram', platformUserId)
    const text = (update.text as string) ?? ''
    let messageType = 'text'
    let fileIdValue: string | null = null

    const doc = update.document as Record<string, unknown> | undefined
    const photo = update.photo as Record<string, unknown>[] | undefined
    const voice = update.voice as Record<string, unknown> | undefined

    if (doc) { messageType = 'document'; fileIdValue = doc.file_id as string }
    else if (photo) { messageType = 'photo'; fileIdValue = (photo[photo.length - 1]?.file_id as string) ?? null }
    else if (voice) { messageType = 'voice_note'; fileIdValue = voice.file_id as string }

    const msg = await db.message.create({
      data: {
        userId,
        platform: 'telegram',
        senderId: String(sender.id ?? ''),
        senderName: String(sender.first_name ?? ''),
        content: text ?? (update.caption as string) ?? '',
        messageType,
        platformMessageId: String(update.message_id ?? ''),
        isOutgoing: false,
      }
    })

    if (fileIdValue) {
      try {
        if (tgCreds.botToken) {
          const fr = await fetch(`https://api.telegram.org/bot${tgCreds.botToken}/getFile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_id: fileIdValue }),
          })
          const fd = await fr.json() as Record<string, unknown>
          const fp = ((fd.result as Record<string, unknown>)?.file_path as string) ?? ''
          if (fp) {
            const dlUrl = `https://api.telegram.org/file/bot${tgCreds.botToken}/${fp}`
            const ext = fp.split('.').pop() ?? 'bin'
            const fname = doc?.file_name as string ?? `telegram.${ext}`
            const fid = await processFileWebhook(userId, dlUrl, fname, messageType)
            if (fid) {
              await db.message.update({
                where: { id: msg.id },
                data: { fileId: fid }
              })
            }
          }
        }
      } catch { /* file skip */ }
    }

    try {
      const embedding = await generateEmbedding(text || '', userId)
      await memoryStore.addChat(String(msg.id), embedding, text || '', {
        sender: String(sender.first_name ?? 'unknown'),
        platform: 'telegram',
        timestamp: String(update.date ?? ''),
        userId: String(userId),
      })
    } catch { /* memory skip */ }

    try {
      socketIO.to(`user:${userId}`).emit('new_message', {
        ...msg,
        fileId: msg.fileId
      })
    } catch { /* ws skip */ }

    if (text && messageType === 'text') {
      triggerAutoReply('telegram', String(sender.first_name ?? ''), text, userId, tgCreds)
    }

    return { status: 'ok' }
  })

  app.get('/webhook/whatsapp', async (req, reply) => {
    const query = req.query as Record<string, string>
    if (query['hub.verify_token'] === env.WHATSAPP_VERIFY_TOKEN) {
      reply.type('text/plain').send(query['hub.challenge'] ?? '')
      return
    }
    return { status: 'verification_failed' }
  })

  function safeCompare(a: string, b: string): boolean {
    try {
      const bufA = Buffer.from(a)
      const bufB = Buffer.from(b)
      if (bufA.length !== bufB.length) return false
      return timingSafeEqual(bufA, bufB)
    } catch {
      return false
    }
  }

  app.post('/webhook/whatsapp', async (req, reply) => {
    const body = req.body as Record<string, unknown>

    const entry = ((body.entry as Record<string, unknown>[])?.[0]) ?? {}
    const changes = ((entry.changes as Record<string, unknown>[])?.[0]) ?? {}
    const value = (changes.value as Record<string, unknown>) ?? {}
    const metadata = (value.metadata as Record<string, unknown>) ?? {}
    const businessPhone = String(metadata.display_phone_number ?? metadata.phone_number_id ?? '')

    const waCreds = await loadWhatsAppCredentials(businessPhone)

    const signature = req.headers['x-hub-signature-256'] as string
    if (waCreds.appSecret) {
      if (!signature) { reply.status(403).send({ detail: 'Missing signature' }); return }
      const rawBody = JSON.stringify(req.body)
      const expected = 'sha256=' + createHmac('sha256', waCreds.appSecret).update(rawBody).digest('hex')
      if (!safeCompare(signature, expected)) {
        reply.status(403).send({ detail: 'Invalid signature' }); return
      }
    }

    try {
      const msgs = (value.messages as Record<string, unknown>[]) ?? []
      if (!msgs.length) return { status: 'ignored' }

      const waMsg = msgs[0]!
      const contact = ((value.contacts as Record<string, unknown>[])?.[0]) ?? {}
      const senderName = ((contact.profile as Record<string, unknown>)?.name as string) ?? ''
      const senderId = waMsg.from as string ?? ''
      const textContent = ((waMsg.text as Record<string, unknown>)?.body as string) ?? ''
      const msgType = waMsg.type as string ?? 'text'
      const userId = await getUserIdForPlatform('whatsapp', businessPhone)

      const message = await db.message.create({
        data: {
          userId,
          platform: 'whatsapp',
          senderId,
          senderName,
          content: textContent,
          messageType: msgType,
          platformMessageId: waMsg.id as string ?? '',
          isOutgoing: false,
        }
      })

      if (['image', 'document', 'audio', 'video'].includes(msgType)) {
        try {
          const mediaPart = waMsg[msgType] as Record<string, unknown> | undefined
          const mediaId = mediaPart?.id as string ?? ''
          if (mediaId && waCreds.accessToken && waCreds.phoneNumberId) {
            const mediaResp = await fetch(`https://graph.facebook.com/v23.0/${mediaId}`, {
              headers: { Authorization: `Bearer ${waCreds.accessToken}` },
            })
            const mediaData = await mediaResp.json() as Record<string, unknown>
            const mediaUrl = mediaData.url as string ?? ''
            const mimeType = mediaData.mime_type as string ?? 'application/octet-stream'
            const fname = (mediaPart?.filename as string) ?? `whatsapp_${mediaId}`
            if (mediaUrl) {
              const fid = await processFileWebhook(userId, mediaUrl, fname, mimeType, {
                Authorization: `Bearer ${waCreds.accessToken}`,
              })
              if (fid) {
                await db.message.update({
                  where: { id: message.id },
                  data: { fileId: fid }
                })
              }
            }
          }
        } catch { /* file skip */ }
      }

      try {
        const embedding = await generateEmbedding(textContent, userId)
        await memoryStore.addChat(String(message.id), embedding, textContent, {
          sender: senderName,
          platform: 'whatsapp',
          timestamp: '',
          userId: String(userId),
        })
      } catch { /* memory skip */ }

      try {
        socketIO.to(`user:${userId}`).emit('new_message', message)
      } catch { /* ws skip */ }

      if (textContent) triggerAutoReply('whatsapp', senderName, textContent, userId, waCreds)
    } catch (err) { console.error('WhatsApp webhook error:', err) }

    return { status: 'ok' }
  })

  app.post('/webhook/slack', async (req, reply) => {
    const body = req.body as Record<string, unknown>

    if (body.type === 'url_verification') return { challenge: body.challenge }

    const event = (body.event as Record<string, unknown>) ?? {}
    const teamId = (event.team as string) ?? (event.team_id as string) ?? ''

    const slackCreds = await loadSlackCredentials(teamId)

    const signature = req.headers['x-slack-signature'] as string
    const timestamp = req.headers['x-slack-request-timestamp'] as string

    if (slackCreds.signingSecret) {
      if (!signature || !timestamp) { reply.status(403).send({ detail: 'Missing Slack signature headers' }); return }
      if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) { reply.status(403).send({ detail: 'Request timestamp too old' }); return }
      const rawBody = JSON.stringify(req.body)
      const sigBasestring = `v0:${timestamp}:${rawBody}`
      const expected = 'v0=' + createHmac('sha256', slackCreds.signingSecret).update(sigBasestring).digest('hex')
      if (!safeCompare(signature, expected)) {
        reply.status(403).send({ detail: 'Invalid signature' }); return
      }
    }

    if (event.type === 'message') {
      const sender = (event.user as string) ?? ''
      const text = (event.text as string) ?? ''
      const slackFiles = (event.files as Record<string, unknown>[]) ?? []
      const userId = await getUserIdForPlatform('slack', teamId)
      let messageType = 'text'
      if (slackFiles.length) messageType = (slackFiles[0]?.mimetype as string) ?? 'file'

      const message = await db.message.create({
        data: {
          userId,
          platform: 'slack',
          senderId: sender,
          senderName: sender,
          content: text,
          messageType,
          platformMessageId: (event.ts as string) ?? '',
          isOutgoing: false,
        }
      })

      for (const f of slackFiles.slice(0, 1)) {
        try {
          const url = (f.url_private_download as string) ?? (f.url_private as string) ?? ''
          if (url && slackCreds.botToken) {
            const fid = await processFileWebhook(userId, url, (f.name as string) ?? 'slack_file',
              (f.mimetype as string) ?? 'application/octet-stream',
              { Authorization: `Bearer ${slackCreds.botToken}` })
            if (fid) {
              await db.message.update({
                where: { id: message.id },
                data: { fileId: fid }
              })
            }
          }
        } catch { /* file skip */ }
      }

      try {
        const embedding = await generateEmbedding(text, userId)
        await memoryStore.addChat(String(message.id), embedding, text, {
          sender,
          platform: 'slack',
          timestamp: (event.ts as string) ?? '',
          userId: String(userId),
        })
      } catch { /* memory skip */ }

      try {
        socketIO.to(`user:${userId}`).emit('new_message', message)
      } catch { /* ws skip */ }

      if (text && !slackFiles.length) triggerAutoReply('slack', sender, text, userId, slackCreds)
    }

    return { status: 'ok' }
  })
}

async function getUserIdForPlatform(platform: string, platformUserId?: string): Promise<number> {
  const conditions: any = { platform, isActive: true }
  if (platformUserId) {
    conditions.platformUserId = platformUserId
  }
  const conn = await db.platformConnection.findFirst({
    where: conditions,
  })
  if (!conn) {
    const detail = platformUserId
      ? `No active platform connection found for '${platform}' with id '${platformUserId}'`
      : `No active platform connection found for '${platform}'`
    throw new Error(detail)
  }
  return conn.userId
}

async function processFileWebhook(
  userId: number,
  fileUrl: string,
  originalName: string,
  fileType: string,
  httpHeaders?: Record<string, string>,
): Promise<number | null> {
  try {
    const resp = await fetch(fileUrl, { headers: { ...httpHeaders } })
    if (!resp.ok) return null
    const content = Buffer.from(await resp.arrayBuffer())
    const ext = originalName.split('.').pop() ?? 'bin'
    const storageDir = join(env.STORAGE_DIR, String(userId))
    await mkdir(storageDir, { recursive: true })
    const storagePath = join(storageDir, `${randomUUID().replace(/-/g, '')}.${ext}`)
    await writeFile(storagePath, content)
    const file = await db.file.create({
      data: {
        userId,
        originalName,
        storageUrl: storagePath,
        fileType,
        sizeBytes: BigInt(content.length),
      }
    })
    return file.id
  } catch {
    return null
  }
}

async function triggerAutoReply(
  platform: string,
  sender: string,
  question: string,
  userId: number,
  creds?: unknown,
): Promise<void> {
  try {
    const queryEmbedding = await generateEmbedding(question, userId)
    const matches = await memoryStore.searchChat(queryEmbedding, 3, { userId: String(userId) })
    const filtered = matches.filter(m => m.similarity >= 0.6)
    if (!filtered.length) return

    const context = filtered.map(m => m.content)
    const answer = await generateAutoReply(question, context)
    const best = filtered[0]!
    const meta = best.metadata as any
    const source = `${meta.sender ?? 'unknown'} di ${meta.platform ?? platform}`
    const autoReplyData = { status: 'found', answer, source, sender, platform, originalQuestion: question }

    try {
      socketIO.to(`user:${userId}`).emit('auto_reply', autoReplyData)
    } catch { /* ws skip */ }

    if (answer) {
      const cited = `${answer}\n\n— Sumber: ${source}`
      const { platformService } = await import('../../core/platform-service.js')
      await platformService.sendMessage(platform, sender, cited, creds as any)
    }
  } catch (err) {
    console.error('Auto reply failed:', err)
  }
}
