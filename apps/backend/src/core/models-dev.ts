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

const MODELS_DEV_URL = 'https://models.dev/catalog.json'

let cache: { catalog: CatalogData | null; fetchedAt: number | null } = {
  catalog: null,
  fetchedAt: null,
}

async function getCatalog(): Promise<CatalogData> {
  const now = Date.now()
  if (cache.catalog && cache.fetchedAt && now - cache.fetchedAt < 300_000) {
    return cache.catalog
  }

  try {
    const res = await fetch(MODELS_DEV_URL, { signal: AbortSignal.timeout(5000) })
    if (res.ok) {
      const data = await res.json() as CatalogData
      cache.catalog = data
      cache.fetchedAt = now
      return data
    }
  } catch {
    // Fallback ke lokal
  }

  cache.catalog = LOCAL_CATALOG
  cache.fetchedAt = now
  return LOCAL_CATALOG
}

const LOCAL_CATALOG: CatalogData = {
  models: {
    'gemini-2.5-flash': { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', family: 'gemini', knowledge: '2025-01', tool_call: true, reasoning: true, limit: { context: 1048576 } },
    'gemini-2.5-pro': { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', family: 'gemini', knowledge: '2025-01', tool_call: true, reasoning: true, limit: { context: 1048576 } },
    'gemini-2.5-flash-lite': { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', family: 'gemini', knowledge: '2025-01', tool_call: true, reasoning: true, limit: { context: 1048576 } },
    'gemini-3.1-flash-lite': { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', family: 'gemini', knowledge: '2025-05', tool_call: true, reasoning: true, limit: { context: 1048576 } },
    'gemini-3.5-flash': { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', family: 'gemini', knowledge: '2025-05', tool_call: true, reasoning: true, limit: { context: 1048576 } },
    'gpt-4o': { id: 'gpt-4o', name: 'GPT-4o', family: 'openai', knowledge: '2024-06', structured_output: true, tool_call: true, limit: { context: 128000 } },
    'gpt-4o-mini': { id: 'gpt-4o-mini', name: 'GPT-4o Mini', family: 'openai', knowledge: '2024-06', tool_call: true, limit: { context: 128000 } },
    'gpt-5.4': { id: 'gpt-5.4', name: 'GPT-5.4', family: 'openai', knowledge: '2026-03', tool_call: true, reasoning: true, limit: { context: 1050000 } },
    'o3-mini': { id: 'o3-mini', name: 'o3-mini', family: 'openai', knowledge: '2025-01', tool_call: true, reasoning: true, limit: { context: 200000 } },
    'claude-sonnet-4-20250514': { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', family: 'anthropic', knowledge: '2025-01', tool_call: true, limit: { context: 200000 } },
    'claude-haiku-3-5-20241022': { id: 'claude-haiku-3-5-20241022', name: 'Claude Haiku 3.5', family: 'anthropic', knowledge: '2024-07', tool_call: true, limit: { context: 200000 } },
    'claude-opus-4-8': { id: 'claude-opus-4-8', name: 'Claude Opus 4.8', family: 'anthropic', knowledge: '2026-05', tool_call: true, reasoning: true, limit: { context: 1000000 } },
    'qwen-plus': { id: 'qwen-plus', name: 'Qwen Plus', family: 'qwen', knowledge: '2025-04', limit: { context: 131072 } },
    'qwen-max': { id: 'qwen-max', name: 'Qwen Max', family: 'qwen', knowledge: '2025-04', limit: { context: 32768 } },
    'qwen-turbo': { id: 'qwen-turbo', name: 'Qwen Turbo', family: 'qwen', knowledge: '2025-04', limit: { context: 1048576 } },
    'text-embedding-v3': { id: 'text-embedding-v3', name: 'Text Embedding V3', family: 'qwen' },
    'deepseek-chat': { id: 'deepseek-chat', name: 'DeepSeek Chat', family: 'deepseek', knowledge: '2025-05', tool_call: true, limit: { context: 1000000 } },
    'deepseek-reasoner': { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', family: 'deepseek', knowledge: '2025-01', tool_call: true, reasoning: true, limit: { context: 1000000 } },
    'llama-3.3-70b-versatile': { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', family: 'meta', knowledge: '2024-12', tool_call: true, limit: { context: 128000 } },
    'llama-4-scout-17b-16e-instruct': { id: 'llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B', family: 'meta', knowledge: '2025-04', tool_call: true, limit: { context: 10000000 } },
    'mistral-large-2411': { id: 'mistral-large-2411', name: 'Mistral Large', family: 'mistral', knowledge: '2024-11', tool_call: true, limit: { context: 128000 } },
    'pixtral-large-2411': { id: 'pixtral-large-2411', name: 'Pixtral Large', family: 'mistral', modalities: { input: ['image'] }, tool_call: true, limit: { context: 128000 } },
    'codestral-2501': { id: 'codestral-2501', name: 'Codestral', family: 'mistral', knowledge: '2025-01', tool_call: true, limit: { context: 256000 } },
    'claude-sonnet-4-6': { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', family: 'anthropic', knowledge: '2026-02', tool_call: true, reasoning: true, limit: { context: 1000000 } },
    'gemini-embedding-001': { id: 'gemini-embedding-001', name: 'Gemini Embedding 001', family: 'gemini' },
    'text-embedding-3-small': { id: 'text-embedding-3-small', name: 'Text Embedding 3 Small', family: 'openai' },
    'whisper-1': { id: 'whisper-1', name: 'Whisper', family: 'openai', modalities: { input: ['audio'] } },
    'grok-4-20': { id: 'grok-4-20', name: 'Grok 4.20', family: 'xai', knowledge: '2026-03', tool_call: true, reasoning: true, limit: { context: 1000000 } },
    'command-a-05-2026': { id: 'command-a-05-2026', name: 'Command A+', family: 'cohere', tool_call: true, limit: { context: 128000 } },
  },
  providers: {
    openai: {
      id: 'openai', name: 'OpenAI', env: ['OPENAI_API_KEY'],
      npm: '@ai-sdk/openai', api: '',
      doc: 'https://platform.openai.com/docs',
      models: {
        'gpt-4o': { cost: { input: 2.5, output: 10.0 } },
        'gpt-4o-mini': { cost: { input: 0.15, output: 0.6 } },
        'gpt-5.4': { cost: { input: 2.2, output: 14.0 } },
        'o3-mini': { cost: { input: 1.1, output: 4.4 } },
        'text-embedding-3-small': { cost: { input: 0.02 } },
        'whisper-1': { cost: { input: 0.006 } },
      },
    },
    google: {
      id: 'google', name: 'Google Gemini', env: ['GOOGLE_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY', 'GEMINI_API_KEY'],
      npm: '@ai-sdk/google', api: '',
      doc: 'https://ai.google.dev/gemini-api/docs/models',
      models: {
        'gemini-2.5-flash': { cost: { input: 0.30, output: 2.50 } },
        'gemini-2.5-pro': { cost: { input: 1.25, output: 10.0 } },
        'gemini-2.5-flash-lite': { cost: { input: 0.10, output: 0.40 } },
        'gemini-3.1-flash-lite': { cost: { input: 0.25, output: 1.50 } },
        'gemini-3.5-flash': { cost: { input: 1.50, output: 9.00 } },
        'gemini-embedding-001': { cost: { input: 0.15 } },
      },
    },
    anthropic: {
      id: 'anthropic', name: 'Anthropic', env: ['ANTHROPIC_API_KEY'],
      npm: '@ai-sdk/anthropic', api: '',
      doc: 'https://docs.anthropic.com',
      models: {
        'claude-sonnet-4-20250514': { cost: { input: 3.0, output: 15.0 } },
        'claude-haiku-3-5-20241022': { cost: { input: 0.8, output: 4.0 } },
        'claude-opus-4-8': { cost: { input: 15.0, output: 75.0 } },
        'claude-sonnet-4-6': { cost: { input: 3.0, output: 15.0 } },
      },
    },
    groq: {
      id: 'groq', name: 'Groq', env: ['GROQ_API_KEY'],
      npm: '@ai-sdk/openai-compatible', api: 'https://api.groq.com/openai/v1',
      doc: 'https://console.groq.com/docs',
      models: {
        'llama-3.3-70b-versatile': { cost: { input: 0.59, output: 0.79 } },
        'llama-4-scout-17b-16e-instruct': {},
      },
    },
    deepseek: {
      id: 'deepseek', name: 'DeepSeek', env: ['DEEPSEEK_API_KEY'],
      npm: '@ai-sdk/openai-compatible', api: 'https://api.deepseek.com',
      doc: 'https://platform.deepseek.com/docs',
      models: {
        'deepseek-chat': { cost: { input: 0.14, output: 0.28 } },
        'deepseek-reasoner': { cost: { input: 0.55, output: 2.19 } },
      },
    },
    qwen: {
      id: 'qwen', name: 'Qwen (Alibaba Cloud)', env: ['QWEN_MODEL', 'QWEN_API_KEY'],
      npm: '@ai-sdk/openai-compatible', api: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
      doc: 'https://www.alibabacloud.com/help/en/model-studio',
      models: {
        'qwen-plus': { cost: { input: 0.4, output: 1.2 } },
        'qwen-max': { cost: { input: 2.0, output: 6.0 } },
        'qwen-turbo': { cost: { input: 0.3, output: 0.6 } },
        'text-embedding-v3': {},
      },
    },
    mistral: {
      id: 'mistral', name: 'Mistral', env: ['MISTRAL_API_KEY'],
      npm: '@ai-sdk/openai-compatible', api: 'https://api.mistral.ai/v1',
      doc: 'https://docs.mistral.ai',
      models: {
        'mistral-large-2411': { cost: { input: 2.0, output: 6.0 } },
        'pixtral-large-2411': { cost: { input: 2.0, output: 6.0 } },
        'codestral-2501': { cost: { input: 1.0, output: 3.0 } },
      },
    },
    xai: {
      id: 'xai', name: 'xAI', env: ['XAI_API_KEY'],
      npm: '@ai-sdk/openai-compatible', api: 'https://api.x.ai/v1',
      doc: 'https://docs.x.ai',
      models: {
        'grok-4-20': { cost: { input: 1.25, output: 2.50 } },
      },
    },
    cohere: {
      id: 'cohere', name: 'Cohere', env: ['COHERE_API_KEY'],
      npm: '@ai-sdk/openai-compatible', api: 'https://api.cohere.ai/v1',
      doc: 'https://docs.cohere.com',
      models: {
        'command-a-05-2026': { cost: { input: 2.5, output: 10.0 } },
      },
    },
    siliconflow: {
      id: 'siliconflow', name: 'SiliconFlow', env: ['SILICONFLOW_API_KEY'],
      npm: '@ai-sdk/openai-compatible', api: 'https://api.siliconflow.com/v1',
      doc: 'https://docs.siliconflow.com',
      models: {},
    },
    openrouter: {
      id: 'openrouter', name: 'OpenRouter', env: ['OPENROUTER_API_KEY'],
      npm: '@ai-sdk/openai-compatible', api: 'https://openrouter.ai/api/v1',
      doc: 'https://openrouter.ai/docs',
      models: {},
    },
    fireworks: {
      id: 'fireworks', name: 'Fireworks AI', env: ['FIREWORKS_API_KEY'],
      npm: '@ai-sdk/openai-compatible', api: 'https://api.fireworks.ai/inference/v1',
      doc: 'https://docs.fireworks.ai',
      models: {},
    },
    together: {
      id: 'together', name: 'Together AI', env: ['TOGETHER_API_KEY'],
      npm: '@ai-sdk/openai-compatible', api: 'https://api.together.xyz/v1',
      doc: 'https://docs.together.ai',
      models: {},
    },
    perplexity: {
      id: 'perplexity', name: 'Perplexity', env: ['PERPLEXITY_API_KEY'],
      npm: '@ai-sdk/openai-compatible', api: 'https://api.perplexity.ai',
      doc: 'https://docs.perplexity.ai',
      models: {},
    },
    github: {
      id: 'github', name: 'GitHub Models', env: ['GITHUB_TOKEN'],
      npm: '@ai-sdk/openai-compatible', api: 'https://models.github.ai/inference',
      doc: 'https://docs.github.com/en/github-models',
      models: {},
    },
    huggingface: {
      id: 'huggingface', name: 'Hugging Face', env: ['HF_API_KEY'],
      npm: '@ai-sdk/openai-compatible', api: 'https://router.huggingface.co/v1',
      doc: 'https://huggingface.co/docs/api-inference',
      models: {},
    },
  },
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
