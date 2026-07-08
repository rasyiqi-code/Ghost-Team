/**
 * Generate admin user + session token langsung via Prisma.
 * Bypass better-auth sign-in yang broken karena Int vs String userId.
 * Output: token string
 */
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

const db = new PrismaClient()

async function main() {
  const email = 'admin@ghost.local'
  const passwordHash = '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5Ku7KjYRGZ0vUkJy5gG3zOs.' // bcrypt hash of 'admin123'

  // Upsert user
  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'Admin',
      emailVerified: true,
    },
  })

  // Create account with password
  await db.account.upsert({
    where: { id: `email-${user.id}` },
    update: { password: passwordHash },
    create: {
      id: `email-${user.id}`,
      userId: user.id,
      accountId: user.id.toString(),
      providerId: 'email',
      password: passwordHash,
    },
  })

  // Create session
  const sessionToken = randomUUID()
  const session = await db.session.create({
    data: {
      id: randomUUID(),
      token: sessionToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600_000), // 7 days
    },
  })

  console.log(sessionToken)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
