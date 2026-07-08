import type { FastifyRequest, FastifyReply } from 'fastify'
import { db } from '@ghost/database'
import { listAvailableModels } from '../../core/ai-models.js'
import { resolveProviderBaseUrl, makeOpenAIProvider } from '../../core/ai-client.js'
import { validate, sendValidationError, ValidationError } from '../../core/validation.js'
import { encrypt, decrypt } from '../../core/encryption.js'
import { aiProviderCreateSchema, aiProviderUpdateSchema } from '@ghost/shared'
import {
  searchModels,
  getModelFamilies,
  searchProviders,
  getProviderModels,
} from '../../core/models-dev.js'

export async function handleGetProviders(req: FastifyRequest) {
  // personal providers
  const personal = await db.aIProvider.findMany({
    where: { userId: req.userId, scope: 'personal' },
  })
  // workspace providers (cari via workspaceId, bukan scope — mencover data lama)
  const ws = await db.workspace.findFirst({
    where: { members: { some: { userId: req.userId } } },
  })
  const wsProviders = ws
    ? await db.aIProvider.findMany({ where: { workspaceId: ws.id } })
    : []
  // global providers (dari owner)
  const globalProviders = await db.aIProvider.findMany({
    where: { scope: 'global' },
  })

  const seen = new Set(personal.map(p => `${p.providerType}:${p.name}`))
  const merged = [
    ...personal.map(p => ({ ...p, apiKey: decrypt(p.apiKey), scope: 'personal' as const })),
    ...globalProviders
      .filter(p => !seen.has(`${p.providerType}:${p.name}`))
      .map(p => ({ ...p, apiKey: decrypt(p.apiKey), scope: 'global' as const })),
    ...wsProviders
      .filter(p => !seen.has(`${p.providerType}:${p.name}`))
      .map(p => ({ ...p, apiKey: decrypt(p.apiKey), scope: 'workspace' as const })),
  ]
  return merged
}

export async function handleCreateProvider(req: FastifyRequest, reply: FastifyReply) {
  let body: {
    provider_type: string; name: string; api_base_url: string
    api_key?: string; model_id: string; is_active?: boolean; scope?: string
  }
  try {
    body = validate(aiProviderCreateSchema, req.body)
  } catch (err) {
    if (err instanceof ValidationError) return sendValidationError(reply, err)
    throw err
  }
  const { provider_type, name, api_base_url, api_key, model_id, is_active = true, scope = 'personal' } = body
  const encryptedKey = encrypt(api_key ?? '')

  // resolve workspaceId jika scope = 'workspace'
  let workspaceId: string | null = null
  if (scope === 'workspace') {
    const ws = await db.workspace.findFirst({
      where: { members: { some: { userId: req.userId, role: 'admin' } } },
    })
    if (!ws) {
      reply.status(403).send({ detail: 'You are not a workspace admin.' })
      return
    }
    workspaceId = ws.id
  }

  try {
    const provider = await db.aIProvider.create({
      data: {
        userId: req.userId,
        providerType: provider_type,
        name,
        apiBaseUrl: api_base_url || '',
        apiKey: encryptedKey,
        modelId: model_id,
        isActive: is_active,
        scope,
        workspaceId,
      }
    })
    reply.status(201).send({ ...provider, apiKey: decrypt(provider.apiKey) })
  } catch (dbErr) {
    console.error('DATABASE ERROR IN handleCreateProvider:', dbErr)
    throw dbErr
  }
}

export async function handleUpdateProvider(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string }
  let body: Record<string, unknown>
  try {
    body = validate(aiProviderUpdateSchema, req.body)
  } catch (err) {
    if (err instanceof ValidationError) return sendValidationError(reply, err)
    throw err
  }
  const user = await db.user.findUnique({ where: { id: req.userId } })
  const isOwner = user?.role === 'owner'
  const existing = await db.aIProvider.findFirst({
    where: isOwner ? { id: Number(id) } : { id: Number(id), userId: req.userId },
  })
  if (!existing) {
    reply.status(404).send({ detail: 'Provider not found' })
    return
  }
  const updateData: Record<string, any> = {}
  if (body.name !== undefined) updateData.name = String(body.name)
  if (body.model_id !== undefined) updateData.modelId = String(body.model_id)
  if (body.is_active !== undefined) updateData.isActive = Boolean(body.is_active)
  if (body.api_key !== undefined) {
    updateData.apiKey = encrypt(String(body.api_key))
  }
  
  if (body.api_base_url !== undefined) {
    updateData.apiBaseUrl = String(body.api_base_url) || ''
  }
  if (body.scope !== undefined) {
    updateData.scope = body.scope
    if (body.scope === 'workspace') {
      const ws = await db.workspace.findFirst({
        where: { members: { some: { userId: req.userId, role: 'admin' } } },
      })
      if (!ws) {
        reply.status(403).send({ detail: 'You are not a workspace admin.' })
        return
      }
      updateData.workspaceId = ws.id
    } else if (body.scope === 'personal' || body.scope === 'global') {
      updateData.workspaceId = null
    }
  }

  const updated = await db.aIProvider.update({
    where: { id: Number(id) },
    data: updateData,
  })
  reply.send({ ...updated, apiKey: decrypt(updated.apiKey) })
}

export async function handleDeleteProvider(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string }
  const user = await db.user.findUnique({ where: { id: req.userId } })
  const isOwner = user?.role === 'owner'
  const existing = await db.aIProvider.findFirst({
    where: isOwner ? { id: Number(id) } : { id: Number(id), userId: req.userId },
  })
  if (!existing) {
    reply.status(404).send({ detail: 'Provider not found' })
    return
  }
  await db.aIProvider.delete({
    where: { id: Number(id) },
  })
  reply.status(204).send()
}

export async function handleGetProviderModels(req: FastifyRequest) {
  const models = await listAvailableModels(req.userId)
  return { models }
}

export async function handleBrowseModels(req: FastifyRequest): Promise<{ models: any[]; families: string[]; total: number }> {
  const { query, family } = req.query as { query?: string; family?: string }
  const models = await searchModels(query, family)
  const families = await getModelFamilies()
  return { models, families, total: models.length }
}

export async function handleBrowseProviders(req: FastifyRequest): Promise<{ providers: any[]; total: number }> {
  const { query } = req.query as { query?: string }
  const providers = await searchProviders(query)
  return { providers, total: providers.length }
}

export async function handleBrowseProviderModels(req: FastifyRequest): Promise<{ providerId: string; models: any[]; total: number }> {
  const { id } = req.params as { id: string }
  const models = await getProviderModels(id)
  return { providerId: id, models, total: models.length }
}

export async function handleTestProvider(req: FastifyRequest) {
  const { api_base_url, api_key, name, model_id } = req.body as { api_base_url: string; api_key?: string; name?: string; model_id?: string }
  const baseURL = await resolveProviderBaseUrl(api_base_url, name)
  try {
    // List models via openai-compatible /v1/models endpoint (Vercel AI SDK tidak punya fungsi ini)
    const modelsUrl = `${baseURL.replace(/\/+$/, '')}/models`

    // Google Gemini API pake x-goog-api-key, bukan Bearer token
    const isGoogle = (name ?? '').toLowerCase().includes('google') ||
                     (name ?? '').toLowerCase().includes('gemini') ||
                     baseURL.includes('generativelanguage.googleapis.com')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (isGoogle) {
      headers['x-goog-api-key'] = api_key ?? ''
    } else {
      headers['Authorization'] = `Bearer ${api_key ?? ''}`
    }

    const res = await fetch(modelsUrl, { headers })
    if (!res.ok) {
      return { status: 'error', detail: `HTTP ${res.status}: ${await res.text()}` }
    }
    const json = await res.json() as Record<string, any>

    // Google native API returns { models: [{ name: "models/gemini-...", ...}] }
    // OpenAI-compatible returns { data: [{ id: "gemini-...", ...}] }
    let models: { id: string }[]
    if (json.models) {
      models = (json.models as { name?: string }[]).map(m => ({
        id: (m.name ?? '').replace(/^models\//, ''),
      }))
    } else if (json.data) {
      models = json.data as { id: string }[]
    } else {
      models = []
    }

    return {
      status: 'ok',
      modelsCount: models.length,
      models: models.slice(0, 10).map((m) => m.id),
    }
  } catch (err) {
    return { status: 'error', detail: String(err) }
  }
}
