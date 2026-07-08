import type { FastifyRequest, FastifyReply } from 'fastify'
import { db } from '@ghost/database'
import { generateEmbedding } from '../../core/ai-embedding.js'
import { memoryStore } from '../../core/memory-store.js'
import { loadSlackCredentials } from '../../core/platform-credentials.js'
import { getUserIdForPlatform, processFileWebhook, triggerAutoReply, socketIO } from './shared.js'
import { timingSafeEqual, createHmac } from 'node:crypto'

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

export async function handleSlackWebhook(req: FastifyRequest, reply: FastifyReply) {
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
    // Skip pesan dari bot sendiri untuk mencegah infinite loop
    if (event.subtype === 'bot_message' || event.bot_id) return { status: 'ignored_bot' }
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

    if (text && !slackFiles.length) {
      const channelId = (event.channel as string) ?? ''
      triggerAutoReply('slack', sender, text, userId, slackCreds, channelId)
    }
  }

  return { status: 'ok' }
}
