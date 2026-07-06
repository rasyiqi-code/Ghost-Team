import { z } from 'zod'

export const systemSettingItemSchema = z.object({
  key: z.string(),
  value: z.string().nullable().optional(),
})

export const envSettingResponseSchema = z.object({
  key: z.string(),
  value: z.string(),
  source: z.string(),
})

export const editableKeys = [
  'OPENAI_API_KEY',
  'OPENAI_BASE_URL',
  'QWEN_MODEL',
  'QWEN_EMBEDDING_MODEL',
  'QWEN_AUDIO_MODEL',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_WEBHOOK_SECRET',
  'SLACK_BOT_TOKEN',
  'SLACK_SIGNING_SECRET',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_VERIFY_TOKEN',
  'WHATSAPP_APP_SECRET',
  'STORAGE_DIR',
] as const

export type SystemSettingItem = z.infer<typeof systemSettingItemSchema>
export type EnvSettingResponse = z.infer<typeof envSettingResponseSchema>
export type EditableKey = (typeof editableKeys)[number]
