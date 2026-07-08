import type { FastifyRequest, FastifyReply } from 'fastify'
import type { Server as SocketIOServer } from 'socket.io'
import { db } from '@ghost/database'
import { platformService } from '../../core/platform-service.js'
import { eventBus } from '../../core/event-bus.js'
import { generateEmbedding } from '../../core/ai-embedding.js'
import { memoryStore } from '../../core/memory-store.js'
import { validate, sendValidationError, ValidationError } from '../../core/validation.js'
import { messageCreateSchema, messageSearchSchema } from '@ghost/shared'
import { decrypt } from '../../core/encryption.js'
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
  let body: {
    platform: string
    receiver_id: string
    content: string
    message_type?: string
    sender_id?: string
    sender_name?: string
    is_outgoing?: boolean
    rag_sources?: string[]
  }
  try {
    body = validate(messageCreateSchema, req.body)
  } catch (err) {
    if (err instanceof ValidationError) return sendValidationError(reply, err)
    throw err
  }
  const { platform, receiver_id, content, message_type = 'text', sender_id, sender_name, is_outgoing, rag_sources } = body
  const userId = req.userId
  const user = await db.user.findFirst({ where: { id: userId } })

  const msg = await db.message.create({
    data: {
      userId,
      platform,
      senderId: sender_id ?? String(userId),
      senderName: sender_name ?? (user?.name ?? ''),
      content,
      messageType: message_type,
      isOutgoing: is_outgoing ?? true,
      ragSources: rag_sources ?? [],
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

  // Forward ke platform lain jika bukan web
  if (platform !== 'web') {
    try {
      await platformService.sendMessage(platform, receiver_id, content ?? '')
    } catch { /* skip */ }
  }

  // Auto-forward: web chat → semua platform eksternal yang terhubung
  if (platform === 'web' && content) {
    try {
      const connections = await db.platformConnection.findMany({
        where: { userId, isActive: true },
      })
      for (const conn of connections) {
        try {
          const recipientId = conn.platformUserId
          if (!recipientId) continue

          let creds: any = undefined
          if (conn.credentialsEncrypted) {
            const raw = decrypt(conn.credentialsEncrypted)
            try { creds = JSON.parse(raw) } catch { creds = { botToken: raw } }
          }

          const ok = await platformService.sendMessage(conn.platform, recipientId, content, creds)
          if (ok) {
            // Simpan outgoing message record
            await db.message.create({
              data: {
                userId,
                platform: conn.platform,
                senderId: String(userId),
                senderName: sender_name ?? (user?.name ?? ''),
                content,
                messageType: 'text',
                isOutgoing: true,
              },
            }).catch(() => {})
          }
        } catch { /* skip per-platform error */ }
      }
    } catch { /* skip connection query error */ }
  }

  // Embed ke RAG memory untuk semantic search & auto-reply
  if (content) {
    generateEmbedding(content, userId).then(embedding => {
      return memoryStore.addChat(String(msg.id), embedding, content, {
        sender: msg.senderName ?? 'unknown',
        platform,
        timestamp: String(msg.timestamp),
        userId: String(userId),
      })
    }).catch(() => { /* memory skip */ })
  }

  reply.status(201).send(msg)
}

export async function handleDeleteMessage(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string }
  const msg = await db.message.findFirst({
    where: { id: Number(id), userId: req.userId },
  })
  if (!msg) {
    reply.status(404).send({ detail: 'Message not found' })
    return
  }
  await db.message.delete({
    where: { id: Number(id) },
  })
  try {
    socketIO.to(`user:${req.userId}`).emit('new_message', {})
  } catch { /* ws skip */ }
  return { status: 'ok' }
}

export async function handleClearMessages(req: FastifyRequest) {
  const userId = req.userId
  const result = await db.message.deleteMany({
    where: { userId },
  })
  return { status: 'ok', deletedCount: result.count }
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
