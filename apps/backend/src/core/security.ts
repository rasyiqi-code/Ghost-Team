import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { env } from '@ghost/config'

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10)
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash)
}

export function createAccessToken(payload: Record<string, unknown>): string {
  return jwt.sign(
    payload,
    env.JWT_SECRET_KEY,
    {
      algorithm: env.JWT_ALGORITHM as 'HS256' | 'HS384' | 'HS512',
      expiresIn: `${env.JWT_ACCESS_TOKEN_EXPIRE_MINUTES}m`,
    },
  )
}

export function decodeAccessToken(token: string): Record<string, unknown> {
  return jwt.verify(token, env.JWT_SECRET_KEY, {
    algorithms: [env.JWT_ALGORITHM as 'HS256' | 'HS384' | 'HS512'],
  }) as Record<string, unknown>
}
