import type { FastifyInstance } from 'fastify'
import { setSocketIO } from './shared.js'
import { getBot } from '../../core/chat-bot.js'
import { handleTelegramWebhook } from './telegram.js'
import { handleWhatsAppStatus, handleWhatsAppPair } from './whatsapp.js'
import { handleSlackWebhook } from './slack.js'
import { initBaileysConnections, setBaileysIO, stopAllBaileys } from '../../core/baileys-service.js'

/**
 * Konversi Request/Response Web standard ke Fastify request/reply.
 * Chat SDK menggunakan Web Fetch API, Fastify butuh adapter kecil.
 */
function toFastifyHandler(
  webhookHandler: (req: Request) => Promise<Response>,
) {
  return async (req: any, reply: any) => {
    // Buat Web Request dari Fastify request
    const url = `${req.protocol}://${req.hostname}${req.url}`
    const headers = new Headers(req.headers as Record<string, string>)

    // Raw body perlu di-serialize ulang ke string
    const body = req.body ? JSON.stringify(req.body) : undefined
    const webRequest = new Request(url, {
      method: req.method,
      headers,
      body,
    })

    const response = await webhookHandler(webRequest)
    reply.status(response.status)

    // Forward response headers
    response.headers.forEach((value, key) => reply.header(key, value))

    const text = await response.text()
    reply.send(text || undefined)
  }
}

export async function webhookModule(app: FastifyInstance): Promise<void> {
  // Inisialisasi socketIO instance agar bisa digunakan oleh shared handlers
  setSocketIO(app.io)

  // Inisialisasi Chat SDK bot (lazy, hanya sekali)
  const bot = getBot()

  // Routing webhook — prioritaskan Chat SDK, fallback ke custom handler
  // Custom handler membaca credentials dari database (platform connections)
  
  // Telegram
  if (bot.webhooks.telegram) {
    app.post('/webhook/telegram', toFastifyHandler((req) => bot.webhooks.telegram!(req)))
  } else {
    // Fallback: custom handler yang load credentials dari DB
    app.post('/webhook/telegram', handleTelegramWebhook)
  }

  // WhatsApp — pake Baileys (WebSocket), bukan HTTP webhook
  app.get('/webhook/whatsapp', handleWhatsAppStatus)
  app.post('/webhook/whatsapp', { preHandler: [app.authenticate] }, handleWhatsAppPair)

  // Init Baileys connections untuk WhatsApp
  setBaileysIO(app.io)
  app.addHook('onReady', async () => {
    try {
      await initBaileysConnections()
    } catch (err) {
      console.error('[webhook] Baileys init error:', err)
    }
  })
  // Graceful shutdown untuk semua koneksi Baileys
  app.addHook('onClose', async () => {
    try {
      await stopAllBaileys()
    } catch (err) {
      console.error('[webhook] Baileys shutdown error:', err)
    }
  })

  // Slack
  if (bot.webhooks.slack) {
    app.post('/webhook/slack', toFastifyHandler((req) => bot.webhooks.slack!(req)))
  } else {
    app.post('/webhook/slack', handleSlackWebhook)
  }
}
