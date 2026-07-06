import { useAuthStore } from '@/stores/authStore'

const BASE_URL = import.meta.env.VITE_API_URL || ''

function normalizePath(path: string): string {
  if (BASE_URL) return path
  return path.startsWith('/api/') ? path : `/api${path}`
}

function getHeaders(): HeadersInit {
  const token = useAuthStore.getState().token
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${BASE_URL}${normalizePath(path)}`
  const options: RequestInit = { method, headers: getHeaders() }

  if (body instanceof FormData) {
    delete (options.headers as Record<string, string>)['Content-Type']
    options.body = body
  } else if (body) {
    options.body = JSON.stringify(body)
  }

  const res = await fetch(url, options)
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    throw new Error(detail.detail || `API error: ${res.status} ${res.statusText}`)
  }
  if (res.status === 204) {
    return {} as T
  }
  return res.json()
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}
