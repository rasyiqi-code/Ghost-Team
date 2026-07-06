import type { FastifyInstance } from 'fastify'
import type { Server as SocketIOServer } from 'socket.io'
import { db } from '@ghost/database'
import { transcribeAudio, summarizeText, decomposeTasks, extractIntent, generateEmbedding } from '../../core/ai.js'
import { platformService } from '../../core/platform-service.js'
import { memoryStore } from '../../core/memory-store.js'
import { validate, sendValidationError, ValidationError } from '../../core/validation.js'
import { voiceCommandTextSchema } from '@ghost/shared'
import { writeFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { eventBus } from '../../core/event-bus.js'

let socketIO: SocketIOServer

export async function voiceModule(app: FastifyInstance): Promise<void> {
  socketIO = app.io

  app.post('/voice/process', { preHandler: [app.authenticate] }, async (req, reply) => {
    const data = await req.file()
    if (!data) {
      reply.status(400).send({ detail: 'No audio file provided' })
      return
    }
    const buffer = await data.toBuffer()
    const ext = data.filename?.split('.').pop() ?? 'webm'
    const tmpPath = join(tmpdir(), `${randomUUID()}.${ext}`)
    await writeFile(tmpPath, buffer)

    const user = await db.user.findFirst({ where: { id: req.userId } })
    const msg = await db.message.create({
      data: {
        userId: req.userId,
        platform: 'web',
        senderId: String(req.userId),
        senderName: user?.name ?? '',
        content: '[Voice note processing...]',
        messageType: 'voice_note',
        isOutgoing: true,
      }
    })

    // processVoiceNote handles its own error recovery internally
    processVoiceNote(req.userId, msg.id, tmpPath).catch(() => {})

    reply.status(202).send({ id: msg.id, status: 'processing' })
  })

  app.post('/voice/command', { preHandler: [app.authenticate] }, async (req, reply) => {
    const contentType = req.headers['content-type'] ?? ''
    let text: string | null = null

    if (contentType.includes('multipart')) {
      const data = await req.file()
      if (data) {
        const buffer = await data.toBuffer()
        const ext = data.filename?.split('.').pop() ?? 'webm'
        const tmpPath = join(tmpdir(), `${randomUUID()}.${ext}`)
        await writeFile(tmpPath, buffer)
        text = await transcribeAudio(tmpPath, req.userId)
        await unlink(tmpPath).catch(() => {})
      }
    } else if (contentType.includes('json')) {
      const body = req.body as { text?: string }
      text = body.text ?? null
    }

    if (!text) {
      reply.status(400).send({ detail: 'No speech content' })
      return
    }

    const intent = await extractIntent(text, req.userId)

    if (!intent.error) {
      const platform = (intent.platform ?? 'All').toLowerCase()
      const messageText = intent.message ?? text
      const receiver = intent.receiver ?? ''
      if (platform !== 'all' && platform !== '') {
        await platformService.sendMessage(platform, receiver, messageText)
      }
    }

    reply.send({ status: 'ok', intent, original_text: text })
  })

  app.post('/voice/command-text', { preHandler: [app.authenticate] }, async (req, reply) => {
    let body: { text: string }
    try {
      body = validate(voiceCommandTextSchema, req.body)
    } catch (err) {
      if (err instanceof ValidationError) return sendValidationError(reply, err)
      throw err
    }
    const { text } = body
    if (!text) {
      reply.status(400).send({ detail: 'No text provided' })
      return
    }
    const intent = await extractIntent(text, req.userId)
    if (!intent.error) {
      const platform = (intent.platform ?? 'All').toLowerCase()
      const messageText = intent.message ?? text
      if (platform !== 'all' && platform !== '') {
        await platformService.sendMessage(platform, intent.receiver ?? '', messageText)
      }
    }
    reply.send({ status: 'ok', intent, original_text: text })
  })

  app.get('/voice/status/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const msg = await db.message.findFirst({
      where: {
        id: Number(id),
        userId: req.userId,
      },
    })
    if (!msg) {
      reply.status(404).send({ detail: 'Voice note not found' })
      return
    }
    if ((msg.content ?? '').toLowerCase().includes('processing')) {
      reply.send({ id: msg.id, status: 'processing' })
      return
    }
    reply.send({ id: msg.id, status: 'completed', transcription: msg.content })
  })
}

async function processVoiceNote(userId: number, messageId: number, audioPath: string): Promise<void> {
  try {
    const rawText = await transcribeAudio(audioPath)
    await unlink(audioPath).catch(() => {})

    if (!rawText) {
      await db.message.update({
        where: { id: messageId },
        data: { content: '[Voice note: no speech detected]', messageType: 'voice_processed' },
      })
      return
    }

    const summary = await summarizeText(rawText)
    const tasks = await decomposeTasks(rawText)

    let display = rawText
    if (summary) display = `📝 ${summary}\n\n${rawText}`
    const taskList = (tasks?.daftar_tugas as unknown[]) ?? []
    if (taskList.length > 0) {
      const taskLines = (taskList as Record<string, string>[]).map(t =>
        `  • [${t.prioritas ?? '?'}] ${t.divisi ?? 'general'}: ${t.deskripsi ?? ''}`
      )
      display += '\n\n📋 Tugas:\n' + taskLines.join('\n')
    }

    await db.message.update({
      where: { id: messageId },
      data: { content: display, messageType: 'voice_processed' },
    })

    try {
      socketIO.to(`user:${userId}`).emit('voice_processed', { id: messageId, status: 'completed', transcription: rawText, summary })
    } catch { /* ws skip */ }

    eventBus.emit('voice:processed', { id: messageId, status: 'completed', transcription: rawText, summary })

    try {
      const embedding = await generateEmbedding(rawText, userId)
      await memoryStore.addChat(String(messageId), embedding, rawText, {
        sender: 'User',
        platform: 'web',
        timestamp: String(Date.now()),
        userId: String(userId),
      })
    } catch { /* memory skip */ }
  } catch (err) {
    console.error('Voice note processing failed:', err)
    await db.message.update({
      where: { id: messageId },
      data: { content: `[Voice note processing failed: ${(err as Error).message}]`, messageType: 'voice_processed' },
    }).catch(() => {})
  }
}
