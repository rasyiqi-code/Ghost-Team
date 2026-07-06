import { create } from 'zustand'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  logout: () => void
}

function loadPersisted<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function persist(key: string, value: unknown) {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, JSON.stringify(value))
    }
  } catch {
    /* noop */
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: loadPersisted<User>('ghost_user'),
  token: loadPersisted<string>('ghost_token'),
  setUser: (user) => {
    persist('ghost_user', user)
    set({ user })
  },
  setToken: (token) => {
    persist('ghost_token', token)
    set({ token })
  },
  logout: () => {
    persist('ghost_user', null)
    persist('ghost_token', null)
    set({ user: null, token: null })
  },
}))
