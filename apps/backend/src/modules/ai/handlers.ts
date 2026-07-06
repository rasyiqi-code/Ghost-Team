import type { FastifyRequest, FastifyReply } from 'fastify'
import { db } from '@ghost/database'
import { listAvailableModels } from '../../core/ai-models.js'
import { resolveProviderBaseUrl, makeClient } from '../../core/ai-client.js'
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
  const providers = await db.aIProvider.findMany({
    where: { userId: req.userId },
  })
  return providers.map(p => ({
    ...p,
    apiKey: decrypt(p.apiKey),
  }))
}

export async function handleCreateProvider(req: FastifyRequest, reply: FastifyReply) {
  let body: { provider_type: string; name: string; api_base_url: string; api_key?: string; model_id: string; is_active?: boolean }
  try {
    body = validate(aiProviderCreateSchema, req.body)
  } catch (err) {
    if (err instanceof ValidationError) return sendValidationError(reply, err)
    throw err
  }
  const { provider_type, name, api_base_url, api_key, model_id, is_active = true } = body
  const encryptedKey = encrypt(api_key ?? '')
  try {
    const provider = await db.aIProvider.create({
      data: {
        userId: req.userId,
        providerType: provider_type,
        name,
        apiBaseUrl: await resolveProviderBaseUrl(api_base_url, name, model_id),
        apiKey: encryptedKey,
        modelId: model_id,
        isActive: is_active,
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
  const existing = await db.aIProvider.findFirst({
    where: {
      id: Number(id),
      userId: req.userId,
    },
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
  
  if (body.api_base_url !== undefined || body.name !== undefined || body.model_id !== undefined) {
    const targetName = body.name !== undefined ? String(body.name) : existing.name
    const targetModel = body.model_id !== undefined ? String(body.model_id) : existing.modelId
    const targetUrl = body.api_base_url !== undefined ? String(body.api_base_url) : existing.apiBaseUrl
    updateData.apiBaseUrl = await resolveProviderBaseUrl(targetUrl, targetName, targetModel)
  }

  const updated = await db.aIProvider.update({
    where: { id: Number(id) },
    data: updateData,
  })
  reply.send({ ...updated, apiKey: decrypt(updated.apiKey) })
}

export async function handleDeleteProvider(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string }
  const existing = await db.aIProvider.findFirst({
    where: {
      id: Number(id),
      userId: req.userId,
    },
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
  const baseURL = await resolveProviderBaseUrl(api_base_url, name, model_id)
  try {
    const client = makeClient(api_key ?? '', baseURL)
    const models = await client.models.list()
    return {
      status: 'ok',
      modelsCount: models.data.length,
      models: models.data.slice(0, 10).map(m => m.id),
    }
  } catch (err) {
    return { status: 'error', detail: String(err) }
  }
}
