import { z } from 'zod'

export const fileResponseSchema = z.object({
  id: z.number(),
  userId: z.number(),
  originalName: z.string(),
  storageUrl: z.string(),
  fileType: z.string(),
  folder: z.string().nullable(),
  sizeBytes: z.number(),
  uploadedAt: z.string(),
  extractedText: z.string().nullable(),
})

export const fileSearchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().default(10),
})

export const fileSearchResponseSchema = z.object({
  results: z.array(fileResponseSchema),
  query: z.string(),
})

export type FileResponse = z.infer<typeof fileResponseSchema>
export type FileSearch = z.infer<typeof fileSearchSchema>
export type FileSearchResponse = z.infer<typeof fileSearchResponseSchema>
