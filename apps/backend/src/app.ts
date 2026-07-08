import Fastify from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import { env, getCorsOrigins } from '@ghost/config'
import { db } from '@ghost/database'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'

import { authPlugin } from './plugins/auth.js'
import { socketPlugin } from './plugins/socket.js'
import { eventBus } from './core/event-bus.js'
import { seedDatabase } from './core/seeder.js'

import { authModule } from './modules/auth/index.js'
import { messagesModule } from './modules/messages/index.js'
import { voiceModule } from './modules/voice/index.js'
import { filesModule } from './modules/files/index.js'
import { platformsModule } from './modules/platforms/index.js'
import { memoryModule } from './modules/memory/index.js'
import { reportsModule } from './modules/reports/index.js'
import { aiModule } from './modules/ai/index.js'
import { webhookModule } from './modules/webhook/index.js'
import { settingsModule } from './modules/settings/index.js'
import { adminModule } from './modules/admin/index.js'
import { notificationsModule } from './modules/notifications/index.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const httpServer = createServer()

export async function buildApp() {
  const app = Fastify({
    serverFactory: (handler) => {
      httpServer.on('request', handler)
      return httpServer
    },
    logger: {
      transport: env.ENVIRONMENT === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  })

  await app.register(cors, {
    origin: getCorsOrigins(),
    credentials: true,
    methods: ['*'],
    allowedHeaders: ['*'],
  })

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
  })

  await app.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 },
  })

  app.decorate('db', db)
  app.decorate('eventBus', eventBus)

  await app.register(authPlugin)
  await app.register(socketPlugin)

  // BUG-6: event bus listeners untuk observability
  eventBus.on('message:created', (data) => {
    app.log.debug({ event: 'message:created', id: data.id, platform: data.platform }, 'Message created')
  })
  eventBus.on('voice:processed', (data) => {
    app.log.info({ event: 'voice:processed', id: data.id, status: data.status }, 'Voice processed')
  })
  eventBus.on('file:indexed', (data) => {
    app.log.info({ event: 'file:indexed', fileId: data.fileId, status: data.status }, 'File indexed')
  })
  eventBus.on('auto:reply', (data) => {
    app.log.info({ event: 'auto:reply', platform: data.platform, status: data.status }, 'Auto-reply triggered')
  })

  await app.register(authModule, { prefix: '/api/auth' })
  await app.register(messagesModule, { prefix: '/api' })
  await app.register(voiceModule, { prefix: '/api' })
  await app.register(filesModule, { prefix: '/api' })
  await app.register(platformsModule, { prefix: '/api' })
  await app.register(memoryModule, { prefix: '/api' })
  await app.register(reportsModule, { prefix: '/api' })
  await app.register(aiModule, { prefix: '/api' })
  await app.register(webhookModule, { prefix: '/api' })
  await app.register(settingsModule, { prefix: '/api' })
  await app.register(adminModule, { prefix: '/api' })
  await app.register(notificationsModule, { prefix: '/api' })

  app.get('/api/health', async () => {
    const start = Date.now()
    const checks: Record<string, string> = {}

    // Database ping
    try {
      await db.$queryRaw`SELECT 1`
      checks.database = 'ok'
    } catch {
      checks.database = 'error'
    }

    // Redis ping (optional — hanya jika REDIS_URL dikonfigurasi)
    if (env.REDIS_URL) {
      try {
        const IORedis = (await import('ioredis')).default
        const redis = new IORedis(env.REDIS_URL, {
          lazyConnect: true,
          maxRetriesPerRequest: 0,
          retryStrategy: () => null,
        })
        await redis.connect()
        await redis.ping()
        await redis.quit()
        checks.redis = 'ok'
      } catch {
        checks.redis = 'error'
      }
    }

    const mem = process.memoryUsage()

    return {
      status: checks.database === 'ok' ? 'ok' : 'degraded',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - start,
      checks,
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + 'MB',
      },
      environment: env.ENVIRONMENT,
    }
  })

  if (env.FRONTEND_DIR) {
    const staticDir = resolve(env.FRONTEND_DIR)
    if (existsSync(staticDir)) {
      await app.register(fastifyStatic, {
        root: staticDir,
        prefix: '/',
        wildcard: false,
      })
      app.setNotFoundHandler((req, reply) => {
        if (!req.url.startsWith('/api') && !req.url.startsWith('/ws')) {
          reply.sendFile('index.html')
        } else {
          reply.status(404).send({ detail: 'Not found' })
        }
      })
    }
  } else {
    const defaultFrontend = resolve(__dirname, '..', '..', '..', 'frontend', 'dist')
    if (existsSync(defaultFrontend)) {
      await app.register(fastifyStatic, {
        root: defaultFrontend,
        prefix: '/',
        wildcard: false,
      })
      app.setNotFoundHandler((req, reply) => {
        if (!req.url.startsWith('/api') && !req.url.startsWith('/ws')) {
          reply.sendFile('index.html')
        } else {
          reply.status(404).send({ detail: 'Not found' })
        }
      })
    }
  }

  return app
}
