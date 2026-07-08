import { z } from 'zod'

export const aiProviderCreateSchema = z.object({
  provider_type: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
  api_base_url: z.string().url().max(500),
  api_key: z.string().default(''),
  model_id: z.string().min(1).max(255),
  is_active: z.boolean().default(true),
  scope: z.enum(['personal', 'workspace', 'global']).default('personal'),
})

export const aiProviderResponseSchema = z.object({
  id: z.number(),
  userId: z.number(),
  providerType: z.string(),
  name: z.string(),
  apiBaseUrl: z.string(),
  apiKey: z.string(),
  modelId: z.string(),
  isActive: z.boolean(),
})

export const aiProviderUpdateSchema = z.object({
  name: z.string().max(255).optional(),
  api_base_url: z.string().url().max(500).optional(),
  api_key: z.string().optional(),
  model_id: z.string().max(255).optional(),
  is_active: z.boolean().optional(),
  scope: z.enum(['personal', 'workspace', 'global']).optional(),
})

export type AIProviderCreate = z.infer<typeof aiProviderCreateSchema>
export type AIProviderResponse = z.infer<typeof aiProviderResponseSchema>
export type AIProviderUpdate = z.infer<typeof aiProviderUpdateSchema>
