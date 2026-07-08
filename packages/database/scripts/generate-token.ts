/**
 * Generate admin user + session token langsung via Prisma.
 * Bypass better-auth sign-in yang broken karena Int vs String userId.
 * Output: token string (prints to stdout)
 */
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

const db = new PrismaClient()

async function main() {
  const email = 'admin@ghost.local'
  const userId = randomUUID()

  // Upsert user with explicit UUID
  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: {
      id: userId,
      email,
      name: 'Admin',
      emailVerified: true,
    },
  })

  // Create session (no account needed — bearer plugin validates session token directly)
  const sessionToken = randomUUID()
  const now = new Date()
  await db.session.create({
    data: {
      id: randomUUID(),
      token: sessionToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600_000), // 7 days
      createdAt: now,
      updatedAt: now,
    },
  })

  // Output token only (for piping)
  console.log(sessionToken)
}

main()
  .catch((e) => {
    console.error('Error:', e.message)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
