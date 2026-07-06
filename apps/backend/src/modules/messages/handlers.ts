import type { FastifyRequest, FastifyReply } from 'fastify'
import type { Server as SocketIOServer } from 'socket.io'
import { db } from '@ghost/database'
import { platformService } from '../../core/platform-service.js'
import { eventBus } from '../../core/event-bus.js'
import { validate, sendValidationError, ValidationError } from '../../core/validation.js'
import { messageCreateSchema, messageSearchSchema } from '@ghost/shared'
import { generateEmbedding } from '../../core/ai-embedding.js'
import { generateAutoReply } from '../../core/ai-chat.js'
import { memoryStore } from '../../core/memory-store.js'

export let socketIO: SocketIOServer

export function setSocketIO(io: SocketIOServer) {
  socketIO = io
}

export async function handleGetMessages(req: FastifyRequest) {
  const { page = '1', page_size = '50', platform } = req.query as Record<string, string>
  const pageNum = Math.max(1, Number(page))
  const limit = Math.min(200, Math.max(1, Number(page_size)))
  const offset = (pageNum - 1) * limit
  const userId = req.userId

  const filter: any = { userId }
  if (platform) filter.platform = platform

  const total = await db.message.count({ where: filter })
  const rows = await db.message.findMany({
    where: filter,
    orderBy: { timestamp: 'desc' },
    skip: offset,
    take: limit,
  })

  return { messages: rows, total, page: pageNum, pageSize: limit }
}

export async function handleSendMessage(req: FastifyRequest, reply: FastifyReply) {
  let body: { platform: string; receiver_id: string; content: string; message_type?: string }
  try {
    body = validate(messageCreateSchema, req.body)
  } catch (err) {
    if (err instanceof ValidationError) return sendValidationError(reply, err)
    throw err
  }
  const { platform, receiver_id, content, message_type = 'text' } = body
  const userId = req.userId
  const user = await db.user.findFirst({ where: { id: userId } })

  const msg = await db.message.create({
    data: {
      userId,
      platform,
      senderId: String(userId),
      senderName: user?.name ?? '',
      content,
      messageType: message_type,
      isOutgoing: true,
    }
  })

  try {
    socketIO.to(`user:${msg.userId}`).emit('new_message', msg)
  } catch { /* ws skip */ }

  eventBus.emit('message:created', {
    id: msg.id,
    userId: msg.userId,
    platform: msg.platform,
    content: msg.content ?? '',
    senderName: msg.senderName ?? '',
    messageType: msg.messageType,
    isOutgoing: msg.isOutgoing,
    timestamp: String(msg.timestamp),
  })

  if (platform !== 'web') {
    try {
      await platformService.sendMessage(platform, receiver_id, content ?? '')
    } catch { /* skip */ }
  } else {
    handleWebAiAssistantReply(userId, content).catch(err => {
      console.error('Gagal memproses balasan AI Asisten:', err)
    })
  }

  reply.status(201).send(msg)
}

async function handleWebAiAssistantReply(userId: number, content: string) {
  let context: string[] = []
  try {
    const queryEmbedding = await generateEmbedding(content, userId)
    const matches = await memoryStore.searchChat(queryEmbedding, 3, { userId: String(userId) })
    context = matches.filter(m => m.similarity >= 0.6).map(m => m.content)
  } catch (err) {
    console.warn('Gagal memuat RAG context untuk asisten AI:', err)
  }

  let answer = ''
  try {
    answer = await generateAutoReply(content, context, userId)
  } catch (err) {
    console.error('Error saat memanggil LLM untuk balasan asisten AI:', err)
    answer = 'Maaf, saya sedang mengalami kendala teknis dan tidak dapat membalas pesan Anda saat ini. Silakan periksa kembali konfigurasi API Key dan Base URL Anda.'
  }

  const aiMsg = await db.message.create({
    data: {
      userId,
      platform: 'web',
      senderId: 'ai-assistant',
      senderName: 'Asisten AI',
      content: answer || 'Maaf, saya tidak mendapat jawaban dari model.',
      messageType: 'text',
      isOutgoing: false,
    }
  })

  try {
    socketIO.to(`user:${userId}`).emit('new_message', aiMsg)
  } catch (err) {
    console.error('Gagal mengirim pesan balasan asisten AI via WebSocket:', err)
  }
}

export async function handleSearchMessages(req: FastifyRequest, reply: FastifyReply) {
  let body: { query: string; page?: number; page_size?: number }
  try {
    body = validate(messageSearchSchema, req.body)
  } catch (err) {
    if (err instanceof ValidationError) return sendValidationError(reply, err)
    throw err
  }
  const { query, page = 1, page_size = 50 } = body
  const userId = req.userId
  const pageNum = Math.max(1, Number(page))
  const limit = Math.min(200, Math.max(1, Number(page_size)))
  const offset = (pageNum - 1) * limit

  const filter = {
    userId,
    content: {
      contains: query,
      mode: 'insensitive' as any,
    }
  }

  const total = await db.message.count({ where: filter })
  const rows = await db.message.findMany({
    where: filter,
    orderBy: { timestamp: 'desc' },
    skip: offset,
    take: limit,
  })

  return { messages: rows, total, page: pageNum, pageSize: limit }
}
