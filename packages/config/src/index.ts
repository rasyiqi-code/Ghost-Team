import dotenv from 'dotenv'
import { resolve } from 'node:path'

// Muat .env dari folder aktif saat ini atau dari root workspace (dua tingkat ke atas)
dotenv.config()
dotenv.config({ path: resolve(process.cwd(), '../../.env') })

import { z } from 'zod'

const envSchema = z.object({
  APP_NAME: z.string().default('ghost-relay'),
  ENVIRONMENT: z.enum(['development', 'production', 'test']).default('production'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().default(8000),

  DATABASE_URL: z.string().default('postgresql://ghost:changeme@localhost:5432/ghost_relay'),
  REDIS_URL: z.string().default(''),

  JWT_SECRET_KEY: z.string().min(1, 'JWT_SECRET_KEY is required'),
  JWT_ALGORITHM: z.string().default('HS256'),
  JWT_ACCESS_TOKEN_EXPIRE_MINUTES: z.coerce.number().default(1440),

  BETTER_AUTH_SECRET: z.string().default('change-me-in-production-secret-key-better-auth-12345'),
  BETTER_AUTH_URL: z.string().default('http://localhost:8000'),

  ENCRYPTION_KEY: z.string().min(1, 'ENCRYPTION_KEY is required'),
  CRYPTO_SALT: z.string().min(1, 'CRYPTO_SALT is required'),

  CORS_ORIGINS: z.string().default('["*"]'),

  OPENAI_API_KEY: z.string().default(''),
  OPENAI_BASE_URL: z.string().default('https://dashscope-intl.aliyuncs.com/compatible-mode/v1'),
  QWEN_MODEL: z.string().default('qwen-plus'),
  QWEN_EMBEDDING_MODEL: z.string().default('text-embedding-v3'),
  QWEN_AUDIO_MODEL: z.string().default('qwen-audio-turbo'),

  STORAGE_DIR: z.string().default('/tmp/ghost-storage'),

  TELEGRAM_BOT_TOKEN: z.string().default(''),
  TELEGRAM_WEBHOOK_SECRET: z.string().default(''),
  SLACK_BOT_TOKEN: z.string().default(''),
  SLACK_SIGNING_SECRET: z.string().default(''),
  WHATSAPP_ACCESS_TOKEN: z.string().default(''),
  WHATSAPP_PHONE_NUMBER_ID: z.string().default(''),
  WHATSAPP_VERIFY_TOKEN: z.string().default('ghost-relay-verify'),
  WHATSAPP_APP_SECRET: z.string().default(''),

  ADMIN_EMAIL: z.string().default('admin@ghost.local'),
  ADMIN_PASSWORD: z.string().default('admin123'),

  FRONTEND_DIR: z.string().default(''),
  PUBLIC_URL: z.string().default(''),
})

export type Env = z.infer<typeof envSchema>

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env: Env = parsed.data!

export function getCorsOrigins(): string[] {
  try {
    const parsed: unknown = JSON.parse(env.CORS_ORIGINS)
    if (Array.isArray(parsed)) return parsed as string[]
  } catch { /* noop */ }
  return ['*']
}
