import type { Server as SocketIOServer } from 'socket.io'
import { db } from '@ghost/database'
import { env } from '@ghost/config'
import { join } from 'node:path'
import { writeFile, mkdir } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { ragSearchAndReply } from '../../core/auto-reply.js'
import { getSetting } from '../../core/db-settings.js'

export let socketIO: SocketIOServer

export function setSocketIO(io: SocketIOServer) {
  socketIO = io
}

export async function getUserIdForPlatform(platform: string, platformUserId?: string): Promise<string> {
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

export async function processFileWebhook(
  userId: string,
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

export async function triggerAutoReply(
  platform: string,
  sender: string,
  question: string,
  userId: string,
  creds?: unknown,
  recipientId?: string,
): Promise<void> {
  try {
    // Auto-reply harus diaktifkan secara eksplisit oleh user (FP-2)
    const enabled = await getSetting('auto_reply_enabled', 'false')
    if (enabled !== 'true') return

    const result = await ragSearchAndReply(question, userId)
    if (!result.hasMatch) return

    const autoReplyData = {
      status: 'found',
      answer: result.answer,
      source: result.source,
      sender,
      platform,
      originalQuestion: question,
    }

    try {
      socketIO.to(`user:${userId}`).emit('auto_reply', autoReplyData)
    } catch { /* ws skip */ }

    if (result.answer) {
      const { platformService } = await import('../../core/platform-service.js')
      const targetId = recipientId || sender
      await platformService.sendMessage(platform, targetId, result.cited, creds as any)
    }
  } catch (err) {
    console.error('Auto reply failed:', err)
  }
}
