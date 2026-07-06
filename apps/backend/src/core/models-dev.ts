const CATALOG_URL = 'https://models.dev/catalog.json'
const CACHE_TTL = 3600_000

interface CatalogData {
  models: Record<string, ModelDef>
  providers: Record<string, ProviderDef>
}

interface ModelDef {
  id: string
  name: string
  description?: string
  family?: string
  attachment?: boolean
  reasoning?: boolean
  tool_call?: boolean
  structured_output?: boolean
  temperature?: boolean
  release_date?: string
  last_updated?: string
  knowledge?: string
  modalities?: { input?: string[]; output?: string[] }
  open_weights?: boolean
  limit?: { context?: number; output?: number; input?: number }
  benchmarks?: string
  license?: string
  links?: string
  weights?: string
}

interface ProviderDef {
  id: string
  name: string
  env: string[]
  npm: string
  api: string
  doc: string
  models: Record<string, ProviderModelDef>
}

interface ProviderModelDef {
  id?: string
  name?: string
  cost?: {
    input?: number
    output?: number
    cache_read?: number
    cache_write?: number
    reasoning?: number
    input_audio?: number
    output_audio?: number
    context_over_200k?: { input?: number; output?: number }
  }
  status?: string
  experimental?: boolean
  reasoning_options?: unknown[]
}

let cache: { catalog: CatalogData | null; fetchedAt: number | null } = {
  catalog: null,
  fetchedAt: null,
}

async function fetchCatalog(): Promise<CatalogData> {
  const resp = await fetch(CATALOG_URL)
  if (!resp.ok) throw new Error(`Failed to fetch catalog: ${resp.status}`)
  return resp.json() as Promise<CatalogData>
}

async function getCatalog(): Promise<CatalogData> {
  const now = Date.now()
  if (cache.catalog && cache.fetchedAt && (now - cache.fetchedAt) < CACHE_TTL) {
    return cache.catalog
  }
  const catalog = await fetchCatalog()
  cache.catalog = catalog
  cache.fetchedAt = now
  return catalog
}

export function invalidateCache(): void {
  cache.catalog = null
  cache.fetchedAt = null
}

export async function getAllModels(): Promise<Record<string, ModelDef>> {
  const catalog = await getCatalog()
  return catalog.models
}

export async function searchModels(query?: string, family?: string): Promise<ModelDef[]> {
  const models = await getAllModels()
  let entries = Object.values(models)
  if (query) {
    const q = query.toLowerCase()
    entries = entries.filter(m =>
      m.id?.toLowerCase().includes(q) ||
      m.name?.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q)
    )
  }
  if (family) {
    entries = entries.filter(m => m.family === family)
  }
  return entries.sort((a, b) => a.id.localeCompare(b.id))
}

export async function getModelFamilies(): Promise<string[]> {
  const models = await getAllModels()
  const families = new Set<string>()
  for (const m of Object.values(models)) {
    if (m.family) families.add(m.family)
  }
  return [...families].sort()
}

export async function getAllProviders(): Promise<Record<string, ProviderDef>> {
  const catalog = await getCatalog()
  return catalog.providers
}

export async function searchProviders(query?: string): Promise<ProviderDef[]> {
  const providers = await getAllProviders()
  let entries = Object.values(providers)
  if (query) {
    const q = query.toLowerCase()
    entries = entries.filter(p =>
      p.id?.toLowerCase().includes(q) ||
      p.name?.toLowerCase().includes(q)
    )
  }
  return entries.sort((a, b) => a.id.localeCompare(b.id))
}

export async function getProviderModels(providerId: string): Promise<ProviderModelDef[]> {
  const providers = await getAllProviders()
  const provider = providers[providerId]
  if (!provider) return []
  const models = Object.values(provider.models)
  return models.sort((a, b) => ((a.id ?? a.name) ?? '').localeCompare(b.id ?? b.name ?? ''))
}
