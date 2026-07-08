import { betterAuth } from 'better-auth'
import { prismaAdapter } from '@better-auth/prisma-adapter'
import { db } from '@ghost/database'
import { bearer } from 'better-auth/plugins'
import { randomUUID } from 'node:crypto'
import { env } from '@ghost/config'

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),
  trustedOrigins: ['http://localhost:5173'],
  advanced: {
    database: {
      generateId: () => randomUUID(),
    },
  },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      console.log('')
      console.log('╔══════════════════════════════════════════════════╗')
      console.log('║          PASSWORD RESET LINK                     ║')
      console.log('╠══════════════════════════════════════════════════╣')
      console.log(`║  User: ${user.email}`)
      console.log(`║  URL:  ${url}`)
      console.log('╚══════════════════════════════════════════════════╝')
      console.log('')
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const count = await db.user.count()
          if (count === 1) {
            await db.user.update({
              where: { id: user.id },
              data: { role: 'owner' },
            })
            console.log(`\n  👑 User pertama "${user.email}" otomatis menjadi platform owner.\n`)
          }
        },
      },
    },
  },
  plugins: [
    bearer(),
  ],
})
