import { getActiveProvider, makeOpenAIProvider } from './ai-client.js'

export async function listAvailableModels(
  userId?: string,
): Promise<{ id: string; providerBaseURL: string; ownedBy: string }[]> {
  const providers: { apiKey: string; baseURL: string }[] = []

  for (const ptype of ['chat', 'embedding', 'audio']) {
    const p = await getActiveProvider(ptype, userId)
    if (p) providers.push({ apiKey: p.apiKey, baseURL: p.baseURL })
  }

  // Deduplikasi berdasarkan baseURL
  const uniqueProviders = providers.filter(
    (p, i, arr) => arr.findIndex(x => x.baseURL === p.baseURL) === i
  )

  const seen = new Set<string>()
  const results: { id: string; providerBaseURL: string; ownedBy: string }[] = []

  for (const p of uniqueProviders) {
    try {
      // Gunakan fetch langsung ke openai-compatible /models endpoint
      const modelsUrl = `${p.baseURL.replace(/\/+$/, '')}/models`
      const res = await fetch(modelsUrl, {
        headers: { 'Authorization': `Bearer ${p.apiKey}` },
      })
      if (!res.ok) continue
      const json = await res.json() as { data?: { id: string; owned_by?: string }[] }
      for (const m of (json.data ?? [])) {
        const key = `${p.baseURL}:${m.id}`
        if (!seen.has(key)) {
          seen.add(key)
          results.push({
            id: m.id,
            providerBaseURL: p.baseURL,
            ownedBy: m.owned_by ?? '',
          })
        }
      }
    } catch { /* skip provider jika error */ }
  }

  return results.sort((a, b) => a.id.localeCompare(b.id))
}
