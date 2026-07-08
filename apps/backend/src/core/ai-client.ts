import { createOpenAI, type OpenAIProvider } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createAnthropic } from '@ai-sdk/anthropic'
import type { LanguageModel, EmbeddingModel } from 'ai'
import { db } from '@ghost/database'
import { decrypt } from './encryption.js'
import { getAllProviders } from './models-dev.js'

const providerCache = new Map<string, any>()
const openaiClientCache = new Map<string, OpenAIProvider>()

/**
 * Buat OpenAI-compatible provider (untuk listing models via /v1/models endpoint).
 */
export function makeOpenAIProvider(apiKey: string, baseURL: string): OpenAIProvider {
  const key = `${apiKey}:${baseURL}`
  if (!openaiClientCache.has(key)) {
    const trimmedUrl = (baseURL || '').trim()
    const p = createOpenAI({
      apiKey: apiKey || 'no-key',
      ...(trimmedUrl ? { baseURL: trimmedUrl } : {}),
    })
    openaiClientCache.set(key, p)
  }
  return openaiClientCache.get(key)!
}

/**
 * Buat provider SDK sesuai npm package dari catalog models.dev.
 * Hanya pass baseURL jika user secara eksplisit menyetelnya.
 * Native SDK (@ai-sdk/google, @ai-sdk/anthropic) punya default URL sendiri.
 */
function createProviderForNpm(
  npmPackage: string,
  apiKey: string,
  userBaseUrl: string | null,
): { chat: (modelId: string) => LanguageModel; embedding?: (modelId: string) => EmbeddingModel } {
  const cacheKey = `${npmPackage}:${apiKey}:${userBaseUrl ?? ''}`
  const cached = providerCache.get(cacheKey)
  if (cached) return cached

  const userSetUrl = (userBaseUrl || '').trim()

  const withUrl = <T extends Record<string, unknown>>(opts: T): T => {
    if (!userSetUrl) return opts
    return { ...opts, baseURL: userSetUrl }
  }

  let result: { chat: (id: string) => LanguageModel; embedding?: (id: string) => EmbeddingModel }

  switch (npmPackage) {
    case '@ai-sdk/google': {
      const p = createGoogleGenerativeAI(withUrl({ apiKey: apiKey || 'no-key' }) as any)
      result = { chat: (id) => p.chat(id), embedding: (id) => p.embedding(id) }
      break
    }
    case '@ai-sdk/anthropic': {
      const p = createAnthropic(withUrl({ apiKey: apiKey || 'no-key' }) as any)
      result = { chat: (id) => p.chat(id) }
      break
    }
    default: {
      const p = createOpenAI(withUrl({ apiKey: apiKey || 'no-key' }))
      result = { chat: (id) => p.chat(id), embedding: (id) => p.textEmbeddingModel(id) }
      break
    }
  }

  providerCache.set(cacheKey, result)
  return result
}

/**
 * Cari npm package untuk provider dari catalog models.dev.
 */
async function resolveNpmPackage(providerNameOrId: string): Promise<string | null> {
  try {
    const providers = await getAllProviders()
    const key = providerNameOrId.toLowerCase()
    const matched = Object.values(providers).find(
      p => p.id.toLowerCase() === key || p.name.toLowerCase() === key,
    )
    if (matched?.npm) return matched.npm
  } catch { /* noop */ }
  return null
}

async function findActiveProvider(userId: string, providerType: string) {
  // 1. user's personal provider
  let provider = await db.aIProvider.findFirst({
    where: { userId, providerType, isActive: true, scope: 'personal' },
  })
  if (provider) return provider
  // 2. workspace default
  const ws = await db.workspace.findFirst({
    where: { members: { some: { userId } } },
  })
  if (ws) {
    provider = await db.aIProvider.findFirst({
      where: { workspaceId: ws.id, providerType, isActive: true, scope: 'workspace' },
    })
  }
  if (provider) return provider
  // 3. global provider (dari owner)
  provider = await db.aIProvider.findFirst({
    where: { scope: 'global', providerType, isActive: true },
  })
  return provider
}

/**
 * Dapatkan LanguageModel dari provider aktif user.
 * Jatuh ke workspace default jika user tidak punya provider sendiri.
 */
export async function getLanguageModel(userId?: string): Promise<{ model: LanguageModel; modelId: string } | null> {
  if (!userId) return null
  try {
    const provider = await findActiveProvider(userId, 'chat')
    if (provider) {
      const npm = await resolveNpmPackage(provider.name) ?? '@ai-sdk/openai-compatible'
      const sdk = createProviderForNpm(npm, decrypt(provider.apiKey), provider.apiBaseUrl)
      return { model: sdk.chat(provider.modelId), modelId: provider.modelId }
    }
  } catch { /* noop */ }
  return null
}

/**
 * Dapatkan EmbeddingModel dari provider aktif user.
 * Jatuh ke workspace default jika user tidak punya provider sendiri.
 */
export async function getEmbeddingModel(userId?: string): Promise<{ model: EmbeddingModel; modelId: string } | null> {
  if (!userId) return null
  try {
    const provider = await findActiveProvider(userId, 'embedding')
    if (provider) {
      const npm = await resolveNpmPackage(provider.name) ?? '@ai-sdk/openai-compatible'
      const sdk = createProviderForNpm(npm, decrypt(provider.apiKey), provider.apiBaseUrl)
      if (sdk.embedding) return { model: sdk.embedding(provider.modelId), modelId: provider.modelId }
    }
  } catch { /* noop */ }
  return null
}

/**
 * Cari base URL dari catalog models.dev (dipakai oleh getActiveProvider & test endpoint).
 */
export async function resolveProviderBaseUrl(
  baseUrlFromUser: string | undefined | null,
  providerNameOrId?: string,
): Promise<string> {
  const url = (baseUrlFromUser || '').trim().replace(/\/+$/, '')
  if (url) return url

  const providerKey = (providerNameOrId || '').toLowerCase()
  try {
    const providers = await getAllProviders()
    const matched = Object.values(providers).find(
      p => p.id.toLowerCase() === providerKey || p.name.toLowerCase() === providerKey
    )
    if (matched?.api) return matched.api.trim().replace(/\/+$/, '')
  } catch { /* noop */ }

  return ''
}

/**
 * Dapatkan raw provider info (untuk audio transcription via openai SDK).
 * Jatuh ke workspace default jika user tidak punya provider sendiri.
 */
export async function getActiveProvider(
  providerType: string,
  userId?: string,
): Promise<{ apiKey: string; baseURL: string; modelId: string } | null> {
  if (!userId) return null
  try {
    const provider = await findActiveProvider(userId, providerType)
    if (provider) {
      const baseURL = await resolveProviderBaseUrl(provider.apiBaseUrl, provider.name)
      return { apiKey: decrypt(provider.apiKey), baseURL, modelId: provider.modelId }
    }
  } catch { /* noop */ }
  return null
}
