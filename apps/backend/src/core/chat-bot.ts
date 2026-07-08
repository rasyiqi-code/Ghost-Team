/**
 * Bot instance terpusat untuk Chat SDK.
 * Semua adapter (Slack, Telegram, WhatsApp) diinisialisasi di sini.
 * Event handler AI terdaftar di sini, webhook route diarahkan ke
 * bot.webhooks.<platform> dari webhook module.
 */
import { Chat } from 'chat'
import { createSlackAdapter } from '@chat-adapter/slack'
import { createTelegramAdapter } from '@chat-adapter/telegram'
import { createWhatsAppAdapter } from '@chat-adapter/whatsapp'
import { createRedisState } from '@chat-adapter/state-redis'
import { env } from '@ghost/config'
import { db } from '@ghost/database'
import { ragSearchAndReply } from './auto-reply.js'
import { generateEmbedding } from './ai-embedding.js'
import { memoryStore } from './memory-store.js'
import { eventBus } from './event-bus.js'
import { getSetting } from './db-settings.js'
import { socketIO } from '../modules/webhook/shared.js'

let _bot: Chat | null = null

export function getBot(): Chat {
  if (!_bot) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adapters: Record<string, any> = {}

    // Hanya inisialisasi adapter jika env var terkait di-set
    if (env.SLACK_BOT_TOKEN && env.SLACK_SIGNING_SECRET) {
      try {
        adapters.slack = createSlackAdapter()
      } catch (err) {
        console.warn('[chat-bot] Slack adapter skipped:', err)
      }
    }
    if (env.TELEGRAM_BOT_TOKEN) {
      try {
        adapters.telegram = createTelegramAdapter()
      } catch (err) {
        console.warn('[chat-bot] Telegram adapter skipped:', err)
      }
    }
    if (env.WHATSAPP_ACCESS_TOKEN) {
      try {
        adapters.whatsapp = createWhatsAppAdapter()
      } catch (err) {
        console.warn('[chat-bot] WhatsApp adapter skipped:', err)
      }
    }

    _bot = new Chat({
      userName: 'ghost-relay-bot',
      adapters,
      state: env.REDIS_URL ? createRedisState({ url: env.REDIS_URL }) : (undefined as any),
      logger: 'info',
    })

    registerBotHandlers(_bot)
  }
  return _bot
}

/**
 * Register semua event handler.
 * AI pipeline (RAG + auto reply) dipanggil di sini.
 */
function registerBotHandlers(bot: Chat): void {
  bot.onNewMessage(/.+/, async (thread, message) => {
    // Ekstrak platform dari thread id (format: "slack:C12345:T67890" dll)
    const platform = (thread as any).platform ?? thread.id.split(':')[0] ?? 'unknown'
    const sender = message.author?.userName ?? message.author?.fullName ?? ''
    const senderId = message.author?.userId ?? ''
    const text = message.text ?? ''

    if (!text) return

    try {
      const userId = await resolveUserId(platform)
      if (!userId) return

      // Simpan pesan ke DB
      const saved = await db.message.create({
        data: {
          userId,
          platform,
          senderId,
          senderName: sender,
          content: text,
          messageType: 'text',
          platformMessageId: message.id ?? '',
          isOutgoing: false,
        },
      })

      // Embed & simpan ke memory store
      try {
        const embedding = await generateEmbedding(text, userId)
        await memoryStore.addChat(String(saved.id), embedding, text, {
          sender,
          platform,
          timestamp: String(message.metadata.dateSent.toISOString()),
          userId: String(userId),
        })
      } catch { /* memory skip */ }

      // Emit event bus
      try {
        eventBus.emit('message:created', {
          id: saved.id,
          userId: saved.userId,
          platform: saved.platform,
          content: saved.content ?? '',
          senderName: saved.senderName ?? '',
          messageType: saved.messageType,
          isOutgoing: saved.isOutgoing,
          timestamp: String(saved.timestamp),
        })
      } catch { /* event bus skip */ }

      // Notify via WebSocket
      try {
        socketIO.to(`user:${userId}`).emit('new_message', saved)
      } catch { /* ws skip */ }

      // Trigger AI auto-reply via RAG (fire and forget)
      void triggerBotAutoReply(platform, sender, text, userId, thread)
    } catch (err) {
      console.error(`[chat-sdk] Handler error on ${platform}:`, err)
    }
  })
}

/**
 * AI auto-reply: RAG search → generate → post di thread.
 */
async function triggerBotAutoReply(
  platform: string,
  sender: string,
  question: string,
  userId: string,
  thread: Parameters<Parameters<typeof Chat.prototype.onNewMessage>[1]>[0],
): Promise<void> {
  try {
    const enabled = await getSetting('auto_reply_enabled', 'false')
    if (enabled !== 'true') return

    const result = await ragSearchAndReply(question, userId)
    if (!result.hasMatch) return
    await thread.post(result.cited)
  } catch (err) {
    console.error('[chat-sdk] Auto reply error:', err)
  }
}

/**
 * Resolve userId dari database berdasarkan platform.
 * Mengambil koneksi platform aktif pertama yang cocok.
 */
async function resolveUserId(platform: string): Promise<string | null> {
  try {
    const conn = await db.platformConnection.findFirst({
      where: { platform, isActive: true },
    })
    return conn?.userId ?? null
  } catch {
    return null
  }
}
