import type { FastifyRequest, FastifyReply } from 'fastify'
import { db } from '@ghost/database'
import { generateEmbedding } from '../../core/ai-embedding.js'
import { memoryStore } from '../../core/memory-store.js'
import { transcribeAudio } from '../../core/ai-audio.js'
import { loadTelegramCredentials } from '../../core/platform-credentials.js'
import { getUserIdForPlatform, processFileWebhook, triggerAutoReply, socketIO } from './shared.js'

export async function handleTelegramWebhook(req: FastifyRequest, reply: FastifyReply) {
  const body = req.body as Record<string, unknown>
  const update = (body.message ?? {}) as Record<string, unknown>
  const chat = (update.chat ?? {}) as Record<string, unknown>
  const sender = (update.from ?? {}) as Record<string, unknown>

  if (!chat.id) return { status: 'ignored' }

  const platformUserId = String(chat.id ?? '')

  // Load per-user Telegram credentials berdasarkan chat_id
  const tgCreds = await loadTelegramCredentials(platformUserId)

  // Verify webhook secret using per-user credentials
  const secretToken = req.headers['x-telegram-bot-api-secret-token']
  if (tgCreds.webhookSecret && secretToken !== tgCreds.webhookSecret) {
    reply.status(403).send({ detail: 'Invalid webhook secret' })
    return
  }

  // Cari user ID — auto-register chat_id baru jika belum terdaftar
  let userId: string
  try {
    userId = await getUserIdForPlatform('telegram', platformUserId)
  } catch {
    // Chat_id belum terdaftar — cari user pemilik bot token
    const ownerConn = await db.platformConnection.findFirst({
      where: { platform: 'telegram', isActive: true },
      orderBy: { id: 'asc' },
    })
    if (!ownerConn) {
      reply.status(400).send({ detail: 'No Telegram connection found. Set up via Settings > Platforms first.' })
      return
    }
    // Auto-register: buat platform connection baru untuk chat_id ini
    await db.platformConnection.create({
      data: {
        userId: ownerConn.userId,
        platform: 'telegram',
        credentialsEncrypted: ownerConn.credentialsEncrypted,
        platformUserId: platformUserId,
        isActive: true,
      },
    })
    console.log(`[telegram] Auto-registered new chat_id: ${platformUserId} for user ${ownerConn.userId}`)
    userId = ownerConn.userId
  }
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
        if (!fd.ok) throw new Error(`Telegram API error: ${fd.description ?? 'unknown'}`)
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

            // Voice note: transcribe setelah file tersimpan
            if (voice) {
              try {
                const fileRecord = await db.file.findUnique({ where: { id: fid } })
                if (fileRecord?.storageUrl) {
                  const transcription = await transcribeAudio(fileRecord.storageUrl, userId)
                  if (transcription) {
                    await db.message.update({
                      where: { id: msg.id },
                      data: {
                        content: transcription,
                        messageType: 'voice_processed',
                      }
                    })

                    // Embed transkrip ke memory store
                    try {
                      const emb = await generateEmbedding(transcription, userId)
                      await memoryStore.addChat(String(msg.id), emb, transcription, {
                        sender: String(sender.first_name ?? 'unknown'),
                        platform: 'telegram',
                        timestamp: String(update.date ?? ''),
                        userId: String(userId),
                      })
                    } catch { /* memory skip */ }

                    // Kirim update via WebSocket
                    try {
                      socketIO.to(`user:${userId}`).emit('voice_processed', {
                        id: msg.id,
                        status: 'completed',
                        transcription,
                      })
                    } catch { /* ws skip */ }
                  }
                }
              } catch { /* transcribe skip */ }
            }
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
    const chatId = String(chat.id ?? '')
    triggerAutoReply('telegram', String(sender.first_name ?? ''), text, userId, tgCreds, chatId)
  }

  return { status: 'ok' }
}
