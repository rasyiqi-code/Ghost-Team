import { create } from 'zustand'
import { api } from '@/lib/api'
import type { Notification } from '@/types'

interface NotifState {
  notifications: Notification[]
  unreadCount: number
  /** Initialize: fetch unread count from server */
  init: () => Promise<void>
  /** Add a notification received via socket */
  addNotification: (notif: Notification) => void
  /** Mark a single notification as read */
  markRead: (id: number) => Promise<void>
  /** Mark all notifications as read */
  markAllRead: () => Promise<void>
  /** Fetch the full notification list */
  fetchList: () => Promise<void>
  /** Reset state on logout */
  reset: () => void
}

export const useNotifStore = create<NotifState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  init: async () => {
    try {
      const { count } = await api.get<{ count: number }>('/notifications/unread-count', { silent: true })
      set({ unreadCount: count })
    } catch { /* noop */ }
  },

  addNotification: (notif) => {
    set((s) => ({
      notifications: [notif, ...s.notifications].slice(0, 50),
      unreadCount: s.unreadCount + 1,
    }))
  },

  markRead: async (id) => {
    await api.post(`/notifications/${id}/read`, {}, { silent: true })
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
      ),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }))
  },

  markAllRead: async () => {
    await api.post('/notifications/all/read', {}, { silent: true })
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })),
      unreadCount: 0,
    }))
  },

  fetchList: async () => {
    try {
      const notifications = await api.get<Notification[]>('/notifications', { silent: true })
      const unreadCount = notifications.filter((n) => !n.readAt).length
      set({ notifications, unreadCount })
    } catch { /* noop */ }
  },

  reset: () => {
    set({ notifications: [], unreadCount: 0 })
  },
}))
