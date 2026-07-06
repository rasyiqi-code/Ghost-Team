import type { ZodSchema } from 'zod'
import type { FastifyReply } from 'fastify'

export class ValidationError extends Error {
  public details: { path: string; message: string }[]

  constructor(details: { path: string; message: string }[]) {
    super('Validation failed')
    this.name = 'ValidationError'
    this.details = details
  }
}

export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }))
    throw new ValidationError(details)
  }
  return result.data
}

export function sendValidationError(reply: FastifyReply, error: ValidationError): void {
  reply.status(400).send({
    detail: 'Validation failed',
    errors: error.details,
  })
}
