/**
 * WhatsApp Baileys Service
 *
 * Menggantikan WhatsApp Business API Graph dengan Baileys (WebSocket protocol unofficial).
 * - No Meta Developer Account required
 * - Cukup scan QR code dari WhatsApp di HP
 * - Multi-device support (HP bisa offline setelah pairing)
 *
 * Flow:
 * 1. User add WhatsApp platform connection di Settings
 * 2. Service mulai Baileys socket untuk user tsb
 * 3. QR code dikirim ke frontend via WebSocket (whatsapp:qr)
 * 4. User scan QR dari HP
 * 5. Service siap menerima & mengirim pesan
 * 6. Auth state disimpan di STORAGE_DIR/whatsapp_sessions/{userId}/
 */

import { makeWASocket, type WASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import QRCode from 'qrcode'
import type { Server as SocketIOServer } from 'socket.io'
import { db } from '@ghost/database'
import { env } from '@ghost/config'
import { join } from 'node:path'
import { mkdir } from 'node:fs/promises'
import { generateEmbedding } from './ai-embedding.js'
import { memoryStore } from './memory-store.js'
import { triggerAutoReply } from '../modules/webhook/shared.js'

interface BaileysConnection {
  socket: WASocket
  userId: string
  platformConnectionId: number
  phoneNumber?: string
}

const connections = new Map<number, BaileysConnection>()
// Set connectionId yang sengaja dihentikan — jangan auto-reconnect
const noReconnectIds = new Set<number>()
let io: SocketIOServer | null = null

export function setBaileysIO(socketIO: SocketIOServer) {
  io = socketIO
}

/**
 * Mulai Baileys untuk semua WhatsApp platform connection yang aktif.
 * Dipanggil sekali saat backend startup.
 */
export async function initBaileysConnections(): Promise<void> {
  try {
    const conns = await db.platformConnection.findMany({
      where: { platform: 'whatsapp', isActive: true },
    })
    for (const conn of conns) {
      startBaileysForUser(conn.userId, conn.id).catch(err =>
        console.error(`[baileys] Failed to start for connection ${conn.id}:`, err)
      )
    }
    console.log(`[baileys] Init: ${conns.length} active WhatsApp connection(s)`)
  } catch (err) {
    console.error('[baileys] Failed to fetch WhatsApp connections:', err)
  }
}

/**
 * Mulai Baileys socket untuk satu user + platform connection.
 */
export async function startBaileysForUser(
  userId: string,
  connectionId: number,
): Promise<void> {
  // Guard: jangan start ulang jika sudah ada koneksi aktif untuk connectionId ini
  if (connections.has(connectionId)) {
    console.log(`[baileys] Connection ${connectionId} already active, skipping`)
    return
  }

  const sessionDir = join(env.STORAGE_DIR, 'whatsapp_sessions', String(userId))
  await mkdir(sessionDir, { recursive: true })

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir)

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    syncFullHistory: false,
    markOnlineOnConnect: true,
  })

  connections.set(connectionId, { socket: sock, userId, platformConnectionId: connectionId })

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr && io) {
      // Generate QR image sebagai data URL
      let qrDataUrl = ''
      try {
        qrDataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 })
      } catch { /* qr gen skip */ }

      // Emit QR code ke frontend user
      io.to(`user:${userId}`).emit('whatsapp:qr', {
        qr,
        qrDataUrl,
        connectionId,
        message: 'Scan QR code ini dengan WhatsApp di HP > Settings > Linked Devices',
      })
      console.log(`[baileys] QR code emitted for user ${userId} (conn ${connectionId})`)
    }

    if (connection === 'open') {
      console.log(`[baileys] Connected! User: ${userId}, conn: ${connectionId}`)

      // Dapatkan nomor telepon yang terhubung
      const phoneNumber = sock.user?.id?.split(':')[0] ?? ''
      if (phoneNumber) {
        await db.platformConnection.update({
          where: { id: connectionId },
          data: { platformUserId: phoneNumber },
        })
      }

      // Notify frontend
      if (io) {
        io.to(`user:${userId}`).emit('whatsapp:ready', {
          connectionId,
          phoneNumber: phoneNumber || 'Unknown',
        })
      }
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode
      const loggedOut = statusCode === DisconnectReason.loggedOut
      // Jangan reconnect jika sengaja dihentikan (force-stop untuk pairing ulang)
      const forceStopped = noReconnectIds.has(connectionId)
      const shouldReconnect = !loggedOut && !forceStopped
      console.log(`[baileys] Disconnected. Reconnect: ${shouldReconnect}, user: ${userId}, conn: ${connectionId}`)

      if (io) {
        io.to(`user:${userId}`).emit('whatsapp:disconnected', {
          connectionId,
          reason: forceStopped ? 'force_stopped' : shouldReconnect ? 'reconnecting' : 'logged_out',
        })
      }

      connections.delete(connectionId)
      noReconnectIds.delete(connectionId)

      if (shouldReconnect) {
        // Reconnect after delay
        setTimeout(() => {
          startBaileysForUser(userId, connectionId).catch(err =>
            console.error(`[baileys] Reconnect failed for ${connectionId}:`, err)
          )
        }, 3000)
      }
    }
  })

  // Simpan credentials saat berubah
  sock.ev.on('creds.update', saveCreds)
  
  // Handler pesan masuk — hanya proses pesan ke diri sendiri (WA "Message yourself")
  // WA berfungsi sebagai relay pribadi owner ke Ghost Relay main chat
  sock.ev.on('messages.upsert', async (msgEvent) => {
    try {
      // Nomor WA kita sendiri (format: '628xxx:15@s.whatsapp.net')
      const ownPhone = sock.user?.id?.split(':')[0] ?? ''
      const ownJid = ownPhone ? `${ownPhone}@s.whatsapp.net` : ''

      for (const msg of msgEvent.messages) {
        const remoteJid = msg.key.remoteJid ?? ''

        // Hanya proses pesan ke diri sendiri (WA "Message yourself")
        // Semua pesan dari/ke kontak lain diabaikan sepenuhnya
        if (!msg.key.fromMe) continue
        if (remoteJid !== ownJid) continue
        if (remoteJid.includes('status@broadcast')) continue
        if (!msg.message) continue

        const textContent =
          (msg.message.conversation) ??
          (msg.message.extendedTextMessage?.text) ??
          ''

        if (!textContent) continue

        // Simpan ke DB sebagai pesan masuk dari owner
        const saved = await db.message.create({
          data: {
            userId,
            platform: 'whatsapp',
            senderId: ownJid,
            senderName: 'Me',
            content: textContent,
            messageType: 'text',
            platformMessageId: msg.key.id ?? '',
            isOutgoing: false,
          },
        })

        // Embed ke memory store untuk RAG
        try {
          const embedding = await generateEmbedding(textContent, userId)
          await memoryStore.addChat(String(saved.id), embedding, textContent, {
            sender: 'Me',
            platform: 'whatsapp',
            timestamp: String(msg.messageTimestamp ?? Date.now()),
            userId: String(userId),
          })
        } catch { /* memory skip */ }

        // Relay ke frontend Ghost Relay
        try {
          io?.to(`user:${userId}`).emit('new_message', saved)
        } catch { /* ws skip */ }

        // Proses AI — sama seperti kirim pesan di main chat
        const waCreds = { accessToken: '', phoneNumberId: '', appSecret: '', verifyToken: '' }
        triggerAutoReply('whatsapp', 'Me', textContent, userId, waCreds, ownJid)
      }
    } catch (err) {
      console.error('[baileys] Message handler error:', err)
    }
  })
}

/**
 * Kirim pesan WhatsApp via Baileys.
 */
export async function sendBaileysMessage(
  userId: string,
  recipientJid: string,
  text: string,
): Promise<boolean> {
  try {
    // Cari connection untuk user ini
    const conn = await db.platformConnection.findFirst({
      where: { platform: 'whatsapp', userId, isActive: true },
      orderBy: { id: 'desc' },
    })
    if (!conn) return false

    const bc = connections.get(conn.id)
    if (!bc) return false

    await bc.socket.sendMessage(recipientJid, { text })
    return true
  } catch (err) {
    console.error('[baileys] sendMessage error:', err)
    return false
  }
}

/**
 * Kirim pesan WhatsApp via Baileys — cari connection dari recipient JID.
 * Dipanggil oleh platformService.sendMessage dari triggerAutoReply.
 */
export async function sendBaileysMessageToJid(
  jid: string,
  text: string,
): Promise<boolean> {
  for (const [, bc] of connections) {
    try {
      await bc.socket.sendMessage(jid, { text })
      return true
    } catch { continue }
  }
  return false
}

/**
 * Hentikan Baileys untuk connection tertentu.
 */
export async function stopBaileys(connectionId: number): Promise<void> {
  const bc = connections.get(connectionId)
  if (bc) {
    bc.socket.end(undefined)
    connections.delete(connectionId)
  }
}

/**
 * Hentikan SEMUA Baileys connections untuk user tertentu.
 * Berguna saat pairing ulang: stop semua socket lama sebelum start baru.
 */
export async function stopAllBaileysForUser(userId: string): Promise<void> {
  for (const [id, bc] of connections) {
    if (bc.userId === userId) {
      // Tandai sebagai force-stop agar tidak auto-reconnect
      noReconnectIds.add(id)
      bc.socket.end(undefined)
      connections.delete(id)
    }
  }
}

/**
 * Hentikan semua Baileys connections.
 */
export async function stopAllBaileys(): Promise<void> {
  for (const [id, bc] of connections) {
    bc.socket.end(undefined)
    connections.delete(id)
  }
}
