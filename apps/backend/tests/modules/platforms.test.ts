import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import Fastify from 'fastify'
import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

// ── hoisted mocks ──────────────────────────────────────────────
const {
  mockFindMany,
  mockFindFirst,
  mockInsertChain,
  mockUpdateChain,
  mockTestConnection,
  mockMigratePlatformUserId,
} = vi.hoisted(() => {
  const returning = vi.fn()
  const values = vi.fn((_data?: any) => ({ returning }))
  const set = vi.fn((_data?: any) => ({ where: vi.fn(() => ({ returning })) }))

  return {
    mockFindMany: vi.fn<(args: [unknown]) => unknown[]>(),
    mockFindFirst: vi.fn<(args: [unknown]) => unknown>(),
    mockInsertChain: vi.fn(() => ({ values })),
    mockUpdateChain: vi.fn(() => ({ set })),
    mockTestConnection: vi.fn<(args: [string, unknown?]) => Record<string, unknown>>(),
    mockMigratePlatformUserId: vi.fn<(args: [number?]) => unknown>(),
  }
})

// ── module-level mocks ─────────────────────────────────────────
vi.mock('@ghost/database', () => ({
  db: {
    platformConnection: {
      findMany: mockFindMany,
      findFirst: mockFindFirst,
      create: async (args: any) => {
        const chain = mockInsertChain()
        const valuesFn = chain.values
        const returningFn = valuesFn(args.data).returning
        const res = await returningFn()
        return res[0] || res
      },
      update: async (args: any) => {
        const chain = mockUpdateChain()
        const setFn = chain.set
        const returningFn = setFn(args.data).where().returning
        const res = await returningFn()
        return res[0] || res
      }
    }
  }
}))

vi.mock('../../src/core/encryption.js', () => {
  const mockEncrypt = vi.fn((s: string) => `encrypted:${s}`)
  const mockDecrypt = vi.fn((s: string) =>
    s.startsWith('encrypted:') ? s.slice('encrypted:'.length) : s,
  )
  return { encrypt: mockEncrypt, decrypt: mockDecrypt }
})

vi.mock('../../src/core/platform-service.js', () => ({
  platformService: {
    testConnection: mockTestConnection,
  },
}))

vi.mock('../../src/core/migrate-platform-user-id.js', () => ({
  migratePlatformUserId: mockMigratePlatformUserId,
}))

// ── helper to build a test app ─────────────────────────────────
async function buildTestApp() {
  const app = Fastify()

  // Minimal auth plugin: sets userId on every request
  app.decorate('authenticate', async function (request: FastifyRequest, _reply: FastifyReply) {
    (request as any).userId = 1
  })

  const { platformsModule } = await import('../../src/modules/platforms/index.js')
  await app.register(platformsModule)

  await app.ready()
  return app
}

// ── fixture helpers ────────────────────────────────────────────
function makeConnection(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    userId: 1,
    platform: 'telegram',
    credentialsEncrypted: '',
    platformUserId: '12345',
    isActive: true,
    ...overrides,
  }
}

// ── tests ──────────────────────────────────────────────────────
describe('Platforms Module', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>

  beforeAll(async () => {
    app = await buildTestApp()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── GET /settings/platforms/meta ──
  describe('GET /settings/platforms/meta', () => {
    it('returns platform metadata list', async () => {
      const res = await app.inject({ method: 'GET', url: '/settings/platforms/meta' })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body).toHaveLength(5)
      expect(body[0]).toMatchObject({ id: 'all', platform: 'all' })
      expect(body[1]).toMatchObject({ id: 'wa', platform: 'whatsapp' })
    })
  })

  // ── GET /settings/webhook-urls ──
  describe('GET /settings/webhook-urls', () => {
    it('returns webhook URLs from request host', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/settings/webhook-urls',
        headers: { host: 'mybot.example.com' },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.telegram).toBe('http://mybot.example.com/api/webhook/telegram')
      expect(body.slack).toBe('http://mybot.example.com/api/webhook/slack')
      expect(body.whatsapp).toBe('http://mybot.example.com/api/webhook/whatsapp')
    })

    it('uses x-forwarded-proto when available', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/settings/webhook-urls',
        headers: { host: 'mybot.example.com', 'x-forwarded-proto': 'https' },
      })
      const body = res.json()
      expect(body.telegram).toBe('https://mybot.example.com/api/webhook/telegram')
    })
  })

  // ── POST /settings/platforms/test ──
  describe('POST /settings/platforms/test', () => {
    it('tests connection with user stored credentials', async () => {
      mockFindFirst.mockResolvedValue(makeConnection({
        credentialsEncrypted: 'encrypted:{"botToken":"tg-bot-123"}',
      }))
      mockTestConnection.mockResolvedValue({ ok: true, bot: 'my_test_bot' })

      const res = await app.inject({
        method: 'POST',
        url: '/settings/platforms/test',
        payload: { platform: 'telegram' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toEqual({ ok: true, bot: 'my_test_bot' })
      // Should call testConnection with parsed credentials
      expect(mockTestConnection).toHaveBeenCalledWith('telegram', { botToken: 'tg-bot-123' })
    })

    it('falls back to env-only test when no stored credentials', async () => {
      mockFindFirst.mockResolvedValue(makeConnection({ credentialsEncrypted: '' }))
      mockTestConnection.mockResolvedValue({ ok: false, error: 'Not configured' })

      const res = await app.inject({
        method: 'POST',
        url: '/settings/platforms/test',
        payload: { platform: 'slack' },
      })

      expect(res.statusCode).toBe(200)
      // Called without credentials (env fallback)
      expect(mockTestConnection).toHaveBeenCalledWith('slack')
    })

    it('handles single-token plaintext credentials (backward compat)', async () => {
      mockFindFirst.mockResolvedValue(makeConnection({
        credentialsEncrypted: 'encrypted:xoxb-raw-slack-token',
      }))
      mockTestConnection.mockResolvedValue({ ok: true, team: 'My Team' })

      const res = await app.inject({
        method: 'POST',
        url: '/settings/platforms/test',
        payload: { platform: 'slack' },
      })

      expect(res.statusCode).toBe(200)
      // Single token gets wrapped as both botToken and accessToken
      expect(mockTestConnection).toHaveBeenCalledWith('slack', {
        botToken: 'xoxb-raw-slack-token',
        accessToken: 'xoxb-raw-slack-token',
      })
    })
  })

  // ── GET /settings/platforms ──
  describe('GET /settings/platforms', () => {
    it('returns list of platform connections for the user', async () => {
      mockFindMany.mockResolvedValue([
        makeConnection({ id: 1, platform: 'telegram' }),
        makeConnection({ id: 2, platform: 'whatsapp' }),
      ])

      const res = await app.inject({ method: 'GET', url: '/settings/platforms' })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body).toHaveLength(2)
      expect(body[0].platform).toBe('telegram')
      expect(body[1].platform).toBe('whatsapp')
    })

    it('returns empty list when user has no connections', async () => {
      mockFindMany.mockResolvedValue([])

      const res = await app.inject({ method: 'GET', url: '/settings/platforms' })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toEqual([])
    })
  })

  // ── POST /settings/platforms ──
  describe('POST /settings/platforms', () => {
    it('creates a new platform connection', async () => {
      mockFindFirst.mockResolvedValue(null) // no existing connection
      mockInsertChain.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            makeConnection({ id: 1, platform: 'telegram', platformUserId: '12345' }),
          ]),
        }),
      })

      const res = await app.inject({
        method: 'POST',
        url: '/settings/platforms',
        payload: {
          platform: 'telegram',
          credentials: 'tg-bot-token-xyz',
          platform_user_id: '12345',
        },
      })

      expect(res.statusCode).toBe(201)
      expect(res.json().platform).toBe('telegram')
      expect(res.json().platformUserId).toBe('12345')
    })

    it('returns 400 when platform already connected', async () => {
      mockFindFirst.mockResolvedValue(makeConnection({ platform: 'telegram' }))

      const res = await app.inject({
        method: 'POST',
        url: '/settings/platforms',
        payload: { platform: 'telegram', credentials: 'some-token' },
      })

      expect(res.statusCode).toBe(400)
      expect(res.json().detail).toBe("Platform 'telegram' already connected")
    })

    it('returns 400 for invalid payload', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/settings/platforms',
        payload: { platform: '' }, // empty platform
      })

      expect(res.statusCode).toBe(400)
      expect(res.json().detail).toBe('Validation failed')
    })
  })

  // ── PUT /settings/platforms/:id ──
  describe('PUT /settings/platforms/:id', () => {
    it('updates platform_user_id', async () => {
      mockFindFirst.mockResolvedValue(makeConnection({ id: 1, platformUserId: null }))
      const returningMock = vi.fn().mockResolvedValue([
        makeConnection({ id: 1, platformUserId: 'new-chat-id' }),
      ])
      const setMock = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ returning: returningMock }),
      })
      mockUpdateChain.mockReturnValue({ set: setMock })

      const res = await app.inject({
        method: 'PUT',
        url: '/settings/platforms/1',
        payload: { platform_user_id: 'new-chat-id' },
      })

      expect(res.statusCode).toBe(200)
      expect(setMock).toHaveBeenCalledWith({ platformUserId: 'new-chat-id' })
    })

    it('toggles is_active', async () => {
      mockFindFirst.mockResolvedValue(makeConnection({ id: 1, isActive: true }))
      const returningMock = vi.fn().mockResolvedValue([
        makeConnection({ id: 1, isActive: false }),
      ])
      const setMock = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ returning: returningMock }),
      })
      mockUpdateChain.mockReturnValue({ set: setMock })

      const res = await app.inject({
        method: 'PUT',
        url: '/settings/platforms/1',
        payload: { is_active: false },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().isActive).toBe(false)
      expect(setMock).toHaveBeenCalledWith({ isActive: false })
    })

    it('returns 404 when connection does not exist', async () => {
      mockFindFirst.mockResolvedValue(null)

      const res = await app.inject({
        method: 'PUT',
        url: '/settings/platforms/999',
        payload: { platform_user_id: 'new-id' },
      })

      expect(res.statusCode).toBe(404)
    })

    it('returns 400 when no fields to update', async () => {
      mockFindFirst.mockResolvedValue(makeConnection({ id: 1 }))

      const res = await app.inject({
        method: 'PUT',
        url: '/settings/platforms/1',
        payload: {},
      })

      expect(res.statusCode).toBe(400)
      expect(res.json().detail).toBe('No fields to update')
    })
  })

  // ── POST /settings/platforms/migrate ──
  describe('POST /settings/platforms/migrate', () => {
    it('runs migration and returns success message with report', async () => {
      mockMigratePlatformUserId.mockResolvedValue({
        total: 2,
        updated: 1,
        skipped: 1,
        details: [
          { id: 1, userId: 1, platform: 'telegram', action: 'backfilled', platformUserId: '12345' },
          { id: 2, userId: 1, platform: 'whatsapp', action: 'needs_input', platformUserId: null },
        ],
      })

      const res = await app.inject({
        method: 'POST',
        url: '/settings/platforms/migrate',
      })

      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.message).toContain('1 backfilled')
      expect(body.report.total).toBe(2)
      expect(mockMigratePlatformUserId).toHaveBeenCalledWith(1) // req.userId
    })

    it('returns all-done message when nothing to migrate', async () => {
      mockMigratePlatformUserId.mockResolvedValue({
        total: 0,
        updated: 0,
        skipped: 0,
        details: [],
      })

      const res = await app.inject({
        method: 'POST',
        url: '/settings/platforms/migrate',
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().message).toBe('All your platform connections already have platformUserId set.')
    })
  })
})
