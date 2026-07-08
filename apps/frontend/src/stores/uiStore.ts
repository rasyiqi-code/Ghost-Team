import { create } from 'zustand'

type Theme = 'light' | 'dark'

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('ghost_theme') as Theme | null
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
  localStorage.setItem('ghost_theme', theme)
}

const initialTheme = getInitialTheme()
applyTheme(initialTheme)

interface UIState {
  theme: Theme
  sidebarOpen: boolean
  currentChatFilter: string | null
  setSidebarOpen: (open: boolean) => void
  setCurrentChatFilter: (filter: string | null) => void
  toggleTheme: () => void
}

export const useUIStore = create<UIState>((set) => ({
  theme: initialTheme,
  sidebarOpen: true,
  currentChatFilter: null,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setCurrentChatFilter: (filter) => set({ currentChatFilter: filter }),
  toggleTheme: () => set((state) => {
    const next = state.theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    return { theme: next }
  }),
}))
