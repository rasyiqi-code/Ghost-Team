import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toast } from 'sonner'

// ── mocks ──────────────────────────────────────────────────────
const mockLogout = vi.fn()

vi.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({
      token: 'test-token',
      logout: mockLogout,
    })),
  },
}))

describe('api.ts — silent flag', () => {
  let api: typeof import('./api').api

  beforeAll(async () => {
    // Mock window.location before importing
    const originalLocation = window.location
    delete (window as any).location
    window.location = { ...originalLocation, href: '' }

    const mod = await import('./api')
    api = mod.api
  })

  beforeEach(() => {
    vi.clearAllMocks()
    window.location.href = ''
  })

  describe('silent: true', () => {
    it('suppresses toast on 400 error', async () => {
      const toastSpy = vi.spyOn(toast, 'error')
      mockFetch(400, { detail: 'Bad request' })

      await expect(api.get('/test', { silent: true })).rejects.toThrow('Bad request')
      expect(toastSpy).not.toHaveBeenCalled()
    })

    it('suppresses toast on 500 error', async () => {
      const toastSpy = vi.spyOn(toast, 'error')
      mockFetch(500, { detail: 'Server error' })

      await expect(api.get('/test', { silent: true })).rejects.toThrow('Server error')
      expect(toastSpy).not.toHaveBeenCalled()
    })

    it('suppresses toast on POST with silent:true', async () => {
      const toastSpy = vi.spyOn(toast, 'error')
      mockFetch(422, { detail: 'Validation failed' })

      await expect(api.post('/data', { foo: 'bar' }, { silent: true })).rejects.toThrow('Validation failed')
      expect(toastSpy).not.toHaveBeenCalled()
    })
  })

  describe('silent: false (default)', () => {
    it('shows toast on 400 error', async () => {
      const toastSpy = vi.spyOn(toast, 'error')
      mockFetch(400, { detail: 'Bad request' })

      await expect(api.get('/test')).rejects.toThrow('Bad request')
      expect(toastSpy).toHaveBeenCalledWith('Bad request', {
        description: 'GET /test',
        duration: 5000,
      })
    })

    it('shows toast on 500 error by default', async () => {
      const toastSpy = vi.spyOn(toast, 'error')
      mockFetch(500, {})

      await expect(api.get('/test')).rejects.toThrow('Server error (500)')
      expect(toastSpy).toHaveBeenCalled()
    })
  })

  describe('401 handling', () => {
    it('does not show toast on 401 errors', async () => {
      const toastSpy = vi.spyOn(toast, 'error')
      mockFetch(401, { detail: 'Unauthorized' })

      await expect(api.get('/test')).rejects.toThrow()
      expect(toastSpy).not.toHaveBeenCalled()
    })

    it('calls logout and redirects on 401', async () => {
      mockFetch(401, { detail: 'Token expired' })

      await expect(api.get('/protected')).rejects.toThrow()
      expect(mockLogout).toHaveBeenCalled()
      expect(window.location.href).toBe('/login')
    })
  })

  describe('successful requests', () => {
    it('returns JSON for 200 response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: 'hello' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const result = await api.get<{ data: string }>('/test')
      expect(result).toEqual({ data: 'hello' })
    })

    it('returns empty object for 204 response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(null, { status: 204 }),
      )

      const result = await api.delete('/test')
      expect(result).toEqual({})
    })

    it('sends Bearer token in headers', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({}), { status: 200 }),
      )

      await api.get('/test')
      const fetchCall = (globalThis.fetch as any).mock.calls[0]
      expect(fetchCall[1].headers['Authorization']).toBe('Bearer test-token')
    })
  })

  describe('HTTP methods', () => {
    it('POST sends JSON body', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 1 }), { status: 201 }),
      )

      await api.post('/test', { name: 'foo' })
      const fetchCall = (globalThis.fetch as any).mock.calls[0]
      expect(fetchCall[1].method).toBe('POST')
      expect(JSON.parse(fetchCall[1].body)).toEqual({ name: 'foo' })
    })

    it('DELETE works without body', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(null, { status: 204 }),
      )

      await api.delete('/test/1')
      const fetchCall = (globalThis.fetch as any).mock.calls[0]
      expect(fetchCall[1].method).toBe('DELETE')
    })
  })
})

// ── helper ─────────────────────────────────────────────────────
function mockFetch(status: number, body: Record<string, unknown>) {
  globalThis.fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}
