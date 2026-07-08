import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'

const BASE_URL = import.meta.env.VITE_API_URL || ''

function normalizePath(path: string): string {
  if (BASE_URL) return path
  return path.startsWith('/api/') ? path : `/api${path}`
}

function getHeaders(hasBody: boolean): HeadersInit {
  const token = useAuthStore.getState().token
  const headers: HeadersInit = {}
  if (hasBody) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

/**
 * Urut-urutkan error dari response API.
 * Return { message, status } agar bisa dipakai oleh caller maupun toast.
 */
function parseError(res: Response): Promise<{ message: string; status: number }> {
  return res.json().catch(() => ({})).then(
    (body: Record<string, unknown>) => ({
      message: (body.detail as string) || `Server error (${res.status})`,
      status: res.status,
    }),
    () => ({ message: `Server error (${res.status})`, status: res.status }),
  )
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: { silent?: boolean },
): Promise<T> {
  const url = `${BASE_URL}${normalizePath(path)}`
  const hasBody = body !== undefined && !(body instanceof FormData)
  const reqOptions: RequestInit = { method, headers: getHeaders(hasBody) }

  if (body instanceof FormData) {
    reqOptions.body = body
  } else if (body) {
    reqOptions.body = JSON.stringify(body)
  }

  const res = await fetch(url, reqOptions)

  if (!res.ok) {
    const error = await parseError(res)

    // Tampilkan toast untuk error non-auth, kecuali dimatikan via silent flag
    if (!options?.silent && error.status !== 401) {
      toast.error(error.message, {
        description: `${method.toUpperCase()} ${path}`,
        duration: 5000,
      })
    }

    // 401 → auth expired, redirect ke login
    if (error.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
      throw new Error('Sesi telah berakhir. Silakan login kembali.')
    }

    throw new Error(error.message)
  }

  if (res.status === 204) {
    return {} as T
  }

  return res.json()
}

export const api = {
  get: <T>(path: string, options?: { silent?: boolean }) =>
    request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: { silent?: boolean }) =>
    request<T>('POST', path, body, options),
  put: <T>(path: string, body?: unknown, options?: { silent?: boolean }) =>
    request<T>('PUT', path, body, options),
  delete: <T>(path: string, options?: { silent?: boolean }) =>
    request<T>('DELETE', path, undefined, options),
}
