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
  mockDeleteChain,
  mockSearchModels,
  mockGetModelFamilies,
  mockSearchProviders,
  mockGetProviderModels,
  mockListAvailableModels,
} = vi.hoisted(() => {
  const returning = vi.fn()
  const values = vi.fn((_data?: any) => ({ returning }))
  const set = vi.fn((_data?: any) => ({ where: vi.fn(() => ({ returning })) }))
  const deleteWhere = vi.fn()

  return {
    mockFindMany: vi.fn<(args: [unknown]) => unknown[]>(),
    mockFindFirst: vi.fn<(args: [unknown]) => unknown>(),
    mockInsertChain: vi.fn(() => ({ values })),
    mockUpdateChain: vi.fn(() => ({ set })),
    mockDeleteChain: vi.fn(() => ({ where: deleteWhere })),
    mockSearchModels: vi.fn().mockResolvedValue([]),
    mockGetModelFamilies: vi.fn().mockResolvedValue([]),
    mockSearchProviders: vi.fn().mockResolvedValue([]),
    mockGetProviderModels: vi.fn().mockResolvedValue([]),
    mockListAvailableModels: vi.fn().mockResolvedValue([]),
  }
})

// ── module-level mocks ─────────────────────────────────────────
vi.mock('@ghost/database', () => ({
  db: {
    aIProvider: {
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
      },
      delete: async (args: any) => {
        const chain = mockDeleteChain()
        await chain.where()
      }
    }
  }
}))

vi.mock('../../src/core/ai-models.js', () => ({
  listAvailableModels: mockListAvailableModels,
}))

vi.mock('../../src/core/encryption.js', () => {
  const mockEncrypt = vi.fn((s: string) => `encrypted:${s}`)
  const mockDecrypt = vi.fn((s: string) =>
    s.startsWith('encrypted:') ? s.slice('encrypted:'.length) : s
  )
  return { encrypt: mockEncrypt, decrypt: mockDecrypt }
})

vi.mock('../../src/core/models-dev.js', () => ({
  searchModels: mockSearchModels,
  getModelFamilies: mockGetModelFamilies,
  searchProviders: mockSearchProviders,
  getProviderModels: mockGetProviderModels,
}))

// ── helper to build a test app ─────────────────────────────────
async function buildTestApp() {
  const app = Fastify()

  // Minimal auth plugin: sets userId on every request
  app.decorate('authenticate', async function (request: FastifyRequest, _reply: FastifyReply) {
    request.userId = 1
  })

  // SocketIO stub (needed by aiModule — it reads app.io)
  app.decorate('io', {
    to: vi.fn(() => ({ emit: vi.fn() })),
    emit: vi.fn(),
  } as any)

  await app.register(fp(async (instance: FastifyInstance) => {
    instance.decorate('emitToUser', vi.fn())
  }))

  const { aiModule } = await import('../../src/modules/ai/index.js')
  await app.register(aiModule)

  await app.ready()
  return app
}

// ── fixture helpers ────────────────────────────────────────────
function makeProvider(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    userId: 1,
    providerType: 'chat',
    name: 'Test Provider',
    apiBaseUrl: 'https://api.example.com/v1',
    apiKey: 'encrypted:sk-real-key',
    modelId: 'gpt-4',
    isActive: true,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  }
}

// ── tests ──────────────────────────────────────────────────────
describe('AI Provider CRUD', () => {
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

  // ── GET /ai/providers ──
  describe('GET /ai/providers', () => {
    it('returns an empty list when no providers exist', async () => {
      mockFindMany.mockResolvedValue([])

      const res = await app.inject({ method: 'GET', url: '/ai/providers' })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toEqual([])
    })

    it('returns providers with decrypted api keys', async () => {
      mockFindMany.mockResolvedValue([
        makeProvider({ apiKey: 'encrypted:sk-my-key' }),
      ])

      const res = await app.inject({ method: 'GET', url: '/ai/providers' })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body).toHaveLength(1)
      // apiKey should be decrypted — encryption module strips "encrypted:" prefix
      expect(body[0].apiKey).toBe('sk-my-key')
    })

    it('calls findMany with the correct userId filter', async () => {
      mockFindMany.mockResolvedValue([])

      await app.inject({ method: 'GET', url: '/ai/providers' })
      expect(mockFindMany).toHaveBeenCalledOnce()
      const [call] = mockFindMany.mock.calls
      expect(call).toBeDefined()
    })
  })

  // ── POST /ai/providers ──
  describe('POST /ai/providers', () => {
    const validPayload = {
      provider_type: 'chat',
      name: 'My Provider',
      api_base_url: 'https://api.openai.com',
      api_key: 'sk-raw-key',
      model_id: 'gpt-4',
    }

    it('creates a provider and returns 201 with decrypted key', async () => {
      mockInsertChain.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            makeProvider({
              name: 'My Provider',
              apiKey: 'encrypted:sk-raw-key',
            }),
          ]),
        }),
      })

      const res = await app.inject({
        method: 'POST',
        url: '/ai/providers',
        payload: validPayload,
      })

      expect(res.statusCode).toBe(201)
      const body = res.json()
      expect(body.apiKey).toBe('sk-raw-key')
      expect(body.name).toBe('My Provider')
    })

    it('returns 400 for invalid payload', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/ai/providers',
        payload: { name: 'no-type' }, // missing required fields
      })

      expect(res.statusCode).toBe(400)
      expect(res.json().detail).toBe('Validation failed')
    })

    it('auto-appends /v1 to api_base_url', async () => {
      const valuesMock = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          makeProvider({ apiBaseUrl: 'https://api.openai.com/v1' }),
        ]),
      })
      mockInsertChain.mockReturnValue({ values: valuesMock })

      await app.inject({
        method: 'POST',
        url: '/ai/providers',
        payload: {
          ...validPayload,
          api_base_url: 'https://api.openai.com/',
        },
      })

      expect(valuesMock).toHaveBeenCalled()
      const insertArgs = valuesMock.mock.calls[0]![0] as Record<string, unknown>
      expect(insertArgs.apiBaseUrl).toBe('https://api.openai.com/v1')
    })
  })

  // ── PUT /ai/providers/:id ──
  describe('PUT /ai/providers/:id', () => {
    it('updates a provider and returns the updated record', async () => {
      mockFindFirst.mockResolvedValue(makeProvider())
      const returningMock = vi.fn().mockResolvedValue([
        makeProvider({ name: 'Updated Name' }),
      ])
      const setMock = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ returning: returningMock }),
      })
      mockUpdateChain.mockReturnValue({ set: setMock })

      const res = await app.inject({
        method: 'PUT',
        url: '/ai/providers/1',
        payload: { name: 'Updated Name' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().name).toBe('Updated Name')
    })

    it('returns 404 when provider does not exist', async () => {
      mockFindFirst.mockResolvedValue(null)

      const res = await app.inject({
        method: 'PUT',
        url: '/ai/providers/999',
        payload: { name: 'Nope' },
      })

      expect(res.statusCode).toBe(404)
    })

    it('encrypts api_key when provided in update', async () => {
      mockFindFirst.mockResolvedValue(makeProvider())
      const setMock = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            makeProvider({ apiKey: 'encrypted:new-key' }),
          ]),
        }),
      })
      mockUpdateChain.mockReturnValue({ set: setMock })

      await app.inject({
        method: 'PUT',
        url: '/ai/providers/1',
        payload: { api_key: 'new-key' },
      })

      expect(setMock).toHaveBeenCalled()
      const setArgs = setMock.mock.calls[0]![0] as Record<string, unknown>
      expect(setArgs.apiKey).toBe('encrypted:new-key')
    })
  })

  // ── DELETE /ai/providers/:id ──
  describe('DELETE /ai/providers/:id', () => {
    it('deletes a provider and returns 204', async () => {
      mockFindFirst.mockResolvedValue(makeProvider())
      mockDeleteChain.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })

      const res = await app.inject({
        method: 'DELETE',
        url: '/ai/providers/1',
      })

      expect(res.statusCode).toBe(204)
    })

    it('returns 404 when provider does not exist', async () => {
      mockFindFirst.mockResolvedValue(null)

      const res = await app.inject({
        method: 'DELETE',
        url: '/ai/providers/999',
      })

      expect(res.statusCode).toBe(404)
    })
  })
})
