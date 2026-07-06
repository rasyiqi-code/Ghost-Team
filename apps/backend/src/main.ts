import { env } from '@ghost/config'
import { buildApp } from './app.js'
import { seedDatabase } from './core/seeder.js'

async function main() {
  const app = await buildApp()

  await app.ready()

  // Warn about default/placeholder secrets in production
  if (env.ENVIRONMENT === 'production') {
    if (env.ADMIN_PASSWORD === 'admin123') {
      console.warn('⚠  ADMIN_PASSWORD is still set to the default value. Change it via environment variable for security.')
    }
    if (env.JWT_SECRET_KEY === 'change-me-in-production') {
      console.warn('⚠  JWT_SECRET_KEY is still set to a placeholder. Generate a strong random secret for production.')
    }
    if (env.ENCRYPTION_KEY === 'change-me-in-production') {
      console.warn('⚠  ENCRYPTION_KEY is still set to a placeholder. Generate a strong random key for production.')
    }
    if (env.CRYPTO_SALT === 'change-me-in-production') {
      console.warn('⚠  CRYPTO_SALT is still set to a placeholder. Generate a random salt for production.')
    }
  }

  try {
    await seedDatabase()
  } catch (err) {
    console.warn('Database seeding skipped:', (err as Error).message)
  }

  await app.listen({ port: env.PORT, host: env.HOST })
  console.log(`Ghost Relay running on http://${env.HOST}:${env.PORT}`)
}

main().catch((err) => {
  console.error('Startup error:', err)
  process.exit(1)
})
