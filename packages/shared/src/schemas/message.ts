import { z } from 'zod'

export const messageCreateSchema = z.object({
  platform: z.string().min(1).max(50),
  receiver_id: z.string(),
  content: z.string().min(1).max(10000),
  message_type: z.string().default('text'),
  sender_id: z.string().optional(),
  sender_name: z.string().optional(),
  is_outgoing: z.boolean().optional(),
  rag_sources: z.array(z.string()).optional(),
})

export const messageResponseSchema = z.object({
  id: z.number(),
  userId: z.number(),
  platform: z.string(),
  senderId: z.string(),
  senderName: z.string().nullable(),
  content: z.string().nullable(),
  messageType: z.string(),
  fileId: z.number().nullable(),
  platformMessageId: z.string().nullable(),
  isOutgoing: z.boolean(),
  timestamp: z.string(),
  ragSources: z.array(z.string()).nullable(),
})

export const messageListResponseSchema = z.object({
  messages: z.array(messageResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
})

export const messageSearchSchema = z.object({
  query: z.string().min(1),
  page: z.number().int().positive().default(1),
  page_size: z.number().int().positive().max(200).default(50),
})

export type MessageCreate = z.infer<typeof messageCreateSchema>
export type MessageResponse = z.infer<typeof messageResponseSchema>
export type MessageListResponse = z.infer<typeof messageListResponseSchema>
export type MessageSearch = z.infer<typeof messageSearchSchema>
