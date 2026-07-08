import { env } from '@ghost/config'
import type { TelegramCredentials, WhatsAppCredentials, SlackCredentials } from './platform-credentials.js'
import { sendBaileysMessageToJid } from './baileys-service.js'

export class PlatformService {
  async testConnection(
    platform: string,
    credentials?: TelegramCredentials | WhatsAppCredentials | SlackCredentials,
  ): Promise<Record<string, unknown>> {
    switch (platform) {
      case 'telegram': return this.testTelegram(credentials as TelegramCredentials | undefined)
      case 'slack': return this.testSlack(credentials as SlackCredentials | undefined)
      case 'whatsapp': return this.testWhatsApp(credentials as WhatsAppCredentials | undefined)
      default: return { ok: false, error: `Unknown platform: ${platform}` }
    }
  }

  async sendMessage(
    platform: string,
    recipient: string,
    message: string,
    credentials?: TelegramCredentials | WhatsAppCredentials | SlackCredentials,
  ): Promise<boolean> {
    try {
      switch (platform) {
        case 'telegram': return this.sendTelegram(recipient, message, credentials as TelegramCredentials | undefined)
        case 'slack': return this.sendSlack(recipient, message, credentials as SlackCredentials | undefined)
        case 'whatsapp': return this.sendWhatsApp(recipient, message, credentials as WhatsAppCredentials | undefined)
        default: return false
      }
    } catch {
      return false
    }
  }

  private getTelegramCreds(c?: TelegramCredentials): TelegramCredentials {
    return c ?? { botToken: '', webhookSecret: '' }
  }

  private getWhatsAppCreds(c?: WhatsAppCredentials): WhatsAppCredentials {
    return c ?? {
      appSecret: '',
      accessToken: '',
      phoneNumberId: '',
      verifyToken: '',
    }
  }

  private getSlackCreds(c?: SlackCredentials): SlackCredentials {
    return c ?? { signingSecret: '', botToken: '' }
  }

  private async testTelegram(creds?: TelegramCredentials): Promise<Record<string, unknown>> {
    const { botToken } = this.getTelegramCreds(creds)
    if (!botToken) return { ok: false, error: 'Telegram bot token not configured' }
    const resp = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
    const data = await resp.json() as Record<string, unknown>
    if (data.ok) return { ok: true, bot: (data.result as Record<string, unknown>).username }
    return { ok: false, error: data.description ?? 'Unknown error' }
  }

  private async testSlack(creds?: SlackCredentials): Promise<Record<string, unknown>> {
    const { botToken } = this.getSlackCreds(creds)
    if (!botToken) return { ok: false, error: 'Slack bot token not configured' }
    const resp = await fetch('https://slack.com/api/auth.test', {
      headers: { Authorization: `Bearer ${botToken}` },
      method: 'POST',
    })
    const data = await resp.json() as Record<string, unknown>
    if (data.ok) return { ok: true, team: data.team, user: data.user }
    return { ok: false, error: data.error ?? 'Unknown error' }
  }

  private async testWhatsApp(creds?: WhatsAppCredentials): Promise<Record<string, unknown>> {
    // WhatsApp sekarang pake Baileys — cek apakah ada koneksi aktif
    return { ok: false, error: 'WhatsApp sekarang menggunakan Baileys (WebSocket). Buka Settings > Connected Platforms untuk pairing via QR code.' }
  }

  private async sendTelegram(chatId: string, message: string, creds?: TelegramCredentials): Promise<boolean> {
    const { botToken } = this.getTelegramCreds(creds)
    if (!botToken) return false
    const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    })
    return resp.ok
  }

  private async sendSlack(channel: string, message: string, creds?: SlackCredentials): Promise<boolean> {
    const { botToken } = this.getSlackCreds(creds)
    if (!botToken) return false
    const resp = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, text: message }),
    })
    const data = await resp.json() as { ok?: boolean }
    return data.ok ?? false
  }

  private async sendWhatsApp(to: string, message: string, creds?: WhatsAppCredentials): Promise<boolean> {
    // WhatsApp sekarang pake Baileys — kirim via WebSocket
    try {
      return await sendBaileysMessageToJid(to, message)
    } catch {
      return false
    }
  }
}

export const platformService = new PlatformService()
