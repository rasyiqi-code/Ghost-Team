import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  name: z.string().min(1).max(255),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const userResponseSchema = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string(),
})

export const tokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string().default('bearer'),
  user: userResponseSchema,
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type UserResponse = z.infer<typeof userResponseSchema>
export type TokenResponse = z.infer<typeof tokenResponseSchema>
