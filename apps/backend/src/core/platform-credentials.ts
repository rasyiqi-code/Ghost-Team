import { db } from '@ghost/database'
import { decrypt } from './encryption.js'
import { env } from '@ghost/config'

// ── credential type per platform ──────────────────────────────

export interface TelegramCredentials {
  botToken: string
  webhookSecret: string
}

export interface WhatsAppCredentials {
  appSecret: string
  accessToken: string
  phoneNumberId: string
  verifyToken: string
}

export interface SlackCredentials {
  signingSecret: string
  botToken: string
}

// ── load helpers ───────────────────────────────────────────────

/**
 * Load and decrypt credentials from the database, falling back to env vars.
 */
function parseCredentials(json: string, platform: string): Record<string, string> {
  try {
    return JSON.parse(json) as Record<string, string>
  } catch {
    // If stored as a single plaintext token, wrap it for backward compat
    if (json) {
      if (platform === 'telegram') return { botToken: json, webhookSecret: '' }
      if (platform === 'whatsapp') return { accessToken: json, phoneNumberId: '', appSecret: '', verifyToken: '' }
      if (platform === 'slack') return { botToken: json, signingSecret: '' }
    }
    return {}
  }
}

// ── load helpers ───────────────────────────────────────────────

export async function loadTelegramCredentials(
  platformUserId: string,
): Promise<TelegramCredentials> {
  const conn = await db.platformConnection.findFirst({
    where: {
      platform: 'telegram',
      platformUserId,
      isActive: true,
    },
  })

  if (conn?.credentialsEncrypted) {
    const raw = decrypt(conn.credentialsEncrypted)
    const parsed = parseCredentials(raw, 'telegram')
    if (parsed.botToken) {
      return {
        botToken: parsed.botToken,
        webhookSecret: parsed.webhookSecret || '',
      }
    }
  }

  return {
    botToken: '',
    webhookSecret: '',
  }
}

export async function loadWhatsAppCredentials(
  businessPhone: string,
): Promise<WhatsAppCredentials> {
  const conn = await db.platformConnection.findFirst({
    where: {
      platform: 'whatsapp',
      platformUserId: businessPhone,
      isActive: true,
    },
  })

  if (conn?.credentialsEncrypted) {
    const raw = decrypt(conn.credentialsEncrypted)
    const parsed = parseCredentials(raw, 'whatsapp')
    if (parsed.accessToken) {
      return {
        appSecret: parsed.appSecret || '',
        accessToken: parsed.accessToken,
        phoneNumberId: parsed.phoneNumberId || '',
        verifyToken: parsed.verifyToken || '',
      }
    }
  }

  return {
    appSecret: '',
    accessToken: '',
    phoneNumberId: '',
    verifyToken: '',
  }
}

export async function loadSlackCredentials(
  teamId: string,
): Promise<SlackCredentials> {
  const conn = await db.platformConnection.findFirst({
    where: {
      platform: 'slack',
      platformUserId: teamId,
      isActive: true,
    },
  })

  if (conn?.credentialsEncrypted) {
    const raw = decrypt(conn.credentialsEncrypted)
    const parsed = parseCredentials(raw, 'slack')
    if (parsed.botToken) {
      return {
        signingSecret: parsed.signingSecret || '',
        botToken: parsed.botToken,
      }
    }
  }

  return {
    signingSecret: '',
    botToken: '',
  }
}
