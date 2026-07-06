import type { z } from 'zod'
import type {
  registerSchema, loginSchema, userResponseSchema, tokenResponseSchema,
  messageCreateSchema, messageResponseSchema, messageListResponseSchema,
  fileResponseSchema, fileSearchSchema,
  voiceProcessResponseSchema, voiceStatusResponseSchema,
  platformConnectionCreateSchema, platformConnectionResponseSchema,
  memorySearchSchema, memorySearchResultSchema, memorySearchResponseSchema,
  reportResponseSchema, reportGenerateResponseSchema,
  aiProviderCreateSchema, aiProviderResponseSchema, aiProviderUpdateSchema,
  systemSettingItemSchema, envSettingResponseSchema,
} from '../schemas/index.js'

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type UserResponse = z.infer<typeof userResponseSchema>
export type TokenResponse = z.infer<typeof tokenResponseSchema>
export type MessageCreate = z.infer<typeof messageCreateSchema>
export type MessageResponseData = z.infer<typeof messageResponseSchema>
export type MessageListResponse = z.infer<typeof messageListResponseSchema>
export type FileResponse = z.infer<typeof fileResponseSchema>
export type FileSearch = z.infer<typeof fileSearchSchema>
export type VoiceProcessResponse = z.infer<typeof voiceProcessResponseSchema>
export type VoiceStatusResponse = z.infer<typeof voiceStatusResponseSchema>
export type PlatformConnectionCreate = z.infer<typeof platformConnectionCreateSchema>
export type PlatformConnectionResponse = z.infer<typeof platformConnectionResponseSchema>
export type MemorySearch = z.infer<typeof memorySearchSchema>
export type MemorySearchResult = z.infer<typeof memorySearchResultSchema>
export type MemorySearchResponse = z.infer<typeof memorySearchResponseSchema>
export type ReportResponse = z.infer<typeof reportResponseSchema>
export type ReportGenerateResponse = z.infer<typeof reportGenerateResponseSchema>
export type AIProviderCreate = z.infer<typeof aiProviderCreateSchema>
export type AIProviderResponse = z.infer<typeof aiProviderResponseSchema>
export type AIProviderUpdate = z.infer<typeof aiProviderUpdateSchema>
export type SystemSettingItem = z.infer<typeof systemSettingItemSchema>
export type EnvSettingResponse = z.infer<typeof envSettingResponseSchema>
