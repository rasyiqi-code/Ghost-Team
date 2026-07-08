import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../src/app.js'

// ── hoisted mocks ──────────────────────────────────────────────
const { mockQueryRaw } = vi.hoisted(() => ({
  mockQueryRaw: vi.fn(),
}))

// ── module-level mocks ─────────────────────────────────────────
vi.mock('@ghost/database', () => ({
  db: {
    $queryRaw: mockQueryRaw,
  },
}))

vi.mock('@ghost/config', () => ({
  env: {
    ENVIRONMENT: 'test',
    REDIS_URL: '',
    FRONTEND_DIR: '',
    HOST: '0.0.0.0',
    PORT: 8000,
  },
  getCorsOrigins: () => ['*'],
}))

// ── tests ──────────────────────────────────────────────────────
describe('GET /api/health', () => {
  let app: Awaited<ReturnType<typeof buildApp>>

  beforeAll(async () => {
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns 200 with status ok when database is healthy', async () => {
    mockQueryRaw.mockResolvedValue([{ 1: 1 }])

    const res = await app.inject({ method: 'GET', url: '/api/health' })
    expect(res.statusCode).toBe(200)

    const body = JSON.parse(res.body)
    expect(body.status).toBe('ok')
    expect(body.uptime).toBeTypeOf('number')
    expect(body.timestamp).toBeTypeOf('string')
    expect(body.responseTimeMs).toBeTypeOf('number')
    expect(body.checks).toEqual({ database: 'ok' })
    expect(body.memory).toHaveProperty('rss')
    expect(body.memory).toHaveProperty('heapTotal')
    expect(body.memory).toHaveProperty('heapUsed')
    expect(body.environment).toBe('test')
  })

  it('returns degraded when database ping fails', async () => {
    mockQueryRaw.mockRejectedValue(new Error('DB connection failed'))

    const res = await app.inject({ method: 'GET', url: '/api/health' })
    expect(res.statusCode).toBe(200)

    const body = JSON.parse(res.body)
    expect(body.status).toBe('degraded')
    expect(body.checks.database).toBe('error')
  })

  it('has uptime increasing over time (or at least non-negative)', async () => {
    mockQueryRaw.mockResolvedValue([{ 1: 1 }])

    const res = await app.inject({ method: 'GET', url: '/api/health' })
    const body = JSON.parse(res.body)
    expect(body.uptime).toBeGreaterThanOrEqual(0)
  })

  it('returns rss memory in MB format', async () => {
    mockQueryRaw.mockResolvedValue([{ 1: 1 }])

    const res = await app.inject({ method: 'GET', url: '/api/health' })
    const body = JSON.parse(res.body)
    expect(body.memory.rss).toMatch(/^\d+MB$/)
    expect(body.memory.heapTotal).toMatch(/^\d+MB$/)
    expect(body.memory.heapUsed).toMatch(/^\d+MB$/)
  })
})
