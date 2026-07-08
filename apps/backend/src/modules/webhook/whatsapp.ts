/**
 * WhatsApp Webhook Handler
 *
 * **Catatan:** WhatsApp sudah menggunakan Baileys (WebSocket protocol),
 * bukan Meta Business API lagi. Oleh karena itu webhook HTTP ini tidak
 * lagi diperlukan untuk menerima pesan.
 *
 * Route ini tetap ada untuk:
 * 1. GET /webhook/whatsapp — health check / status
 * 2. POST /webhook/whatsapp — endpoint untuk pairing dari frontend (trigger reconnect)
 */

import type { FastifyRequest, FastifyReply } from 'fastify'
import { startBaileysForUser, stopAllBaileysForUser } from '../../core/baileys-service.js'
import { db } from '@ghost/database'

/**
 * GET /webhook/whatsapp
 * Status endpoint — menunjukkan koneksi Baileys saat ini.
 */
export async function handleWhatsAppStatus(req: FastifyRequest, reply: FastifyReply) {
  const conns = await db.platformConnection.findMany({
    where: { platform: 'whatsapp', isActive: true },
    select: { id: true, userId: true, platformUserId: true, isActive: true },
  })

  return {
    status: 'ok',
    method: 'Baileys (WhatsApp Web protocol)',
    note: 'Pesan diterima via WebSocket, bukan HTTP webhook. Scan QR code di Settings > Connected Platforms.',
    connections: conns.map(c => ({
      id: c.id,
      userId: c.userId?.substring(0, 8),
      phoneNumber: c.platformUserId || '(not paired yet)',
      isActive: c.isActive,
    })),
  }
}

/**
 * POST /webhook/whatsapp
 * Trigger pairing ulang untuk user tertentu.
 * Body: { connectionId?: number, userId?: string }
 */
export async function handleWhatsAppPair(req: FastifyRequest, reply: FastifyReply) {
  const body = req.body as { connectionId?: number; userId?: string } | null
  const userId = body?.userId ?? req.userId

  if (!userId) {
    reply.status(400).send({ detail: 'userId required' })
    return
  }

  // Cari platform connection WhatsApp milik user
  const conn = body?.connectionId
    ? await db.platformConnection.findFirst({
        where: { id: body.connectionId, userId, platform: 'whatsapp' },
      })
    : await db.platformConnection.findFirst({
        where: { userId, platform: 'whatsapp', isActive: true },
      })

  if (!conn) {
    reply.status(404).send({ detail: 'No WhatsApp connection found. Add one first in Settings.' })
    return
  }

  // Stop SEMUA Baileys connection untuk user ini (prevent duplicate sockets)
  await stopAllBaileysForUser(userId)

  // Small delay untuk cleanup
  await new Promise(r => setTimeout(r, 500))

  // Start fresh
  startBaileysForUser(userId, conn.id).catch(err => {
    console.error('[whatsapp] Pair trigger error:', err)
  })

  reply.send({
    status: 'pairing',
    connectionId: conn.id,
    message: 'QR code akan muncul dalam beberapa detik. Periksa notifikasi di browser.',
  })
}
