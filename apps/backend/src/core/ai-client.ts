import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import OpenAI from 'openai'
import { db } from '@ghost/database'
import { decrypt } from './encryption.js'
import { getAllProviders } from './models-dev.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const fallbackProvidersPath = join(__dirname, 'fallback-providers.json')

let fallbackUrls: Record<string, string> = {}
try {
  fallbackUrls = JSON.parse(readFileSync(fallbackProvidersPath, 'utf8'))
} catch (err) {
  console.error('Failed to load fallback-providers.json:', err)
}

const clientCache = new Map<string, OpenAI>()

export function makeClient(apiKey: string, baseURL: string): OpenAI {
  const key = `${apiKey}:${baseURL}`
  if (!clientCache.has(key)) {
    const config: { apiKey: string; baseURL?: string } = { apiKey }
    const trimmedUrl = (baseURL || '').trim()
    if (trimmedUrl) {
      config.baseURL = trimmedUrl
    }
    clientCache.set(key, new OpenAI(config))
  }
  return clientCache.get(key)!
}

export async function getActiveProvider(
  providerType: string,
  userId?: number,
): Promise<{ apiKey: string; baseURL: string; modelId: string } | null> {
  if (!userId) return null
  try {
    const provider = await db.aIProvider.findFirst({
      where: { userId, providerType, isActive: true },
    })
    if (provider) {
      const resolvedBaseUrl = await resolveProviderBaseUrl(provider.apiBaseUrl, provider.name, provider.modelId)
      return {
        apiKey: decrypt(provider.apiKey),
        baseURL: resolvedBaseUrl,
        modelId: provider.modelId,
      }
    }
  } catch { /* noop */ }
  return null
}

export async function resolveProviderBaseUrl(
  baseUrlFromUser: string | undefined | null,
  providerNameOrId?: string,
  modelId?: string,
): Promise<string> {
  const url = (baseUrlFromUser || '').trim().replace(/\/+$/, '')
  if (url) {
    return url
  }

  const providerKey = (providerNameOrId || '').toLowerCase()

  // 1. Coba cari provider secara dinamis di catalog models.dev
  try {
    const providers = await getAllProviders()
    const matchedProvider = Object.values(providers).find(
      p => p.id.toLowerCase() === providerKey || p.name.toLowerCase() === providerKey
    )
    if (matchedProvider && matchedProvider.api) {
      return matchedProvider.api.trim().replace(/\/+$/, '')
    }
  } catch (err) {
    console.error('Error fetching providers catalog:', err)
  }

  // 2. Gunakan fallback dari config file
  for (const [key, fallbackUrl] of Object.entries(fallbackUrls)) {
    if (providerKey.includes(key)) {
      return fallbackUrl
    }
  }

  return ''
}
