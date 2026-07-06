import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  currentChatFilter: string | null
  setSidebarOpen: (open: boolean) => void
  setCurrentChatFilter: (filter: string | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  currentChatFilter: null,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setCurrentChatFilter: (filter) => set({ currentChatFilter: filter }),
}))
