import { Link, useNavigate } from '@tanstack/react-router'
import { Ghost, Settings, LogOut, Moon, Sun, Shield, Bell, BellRing, ExternalLink } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { useNotifStore } from '@/stores/notifStore'
import { disconnectSocket } from '@/lib/socket'
import { api } from '@/lib/api'
import { useState, useEffect, useCallback } from 'react'

export function Navigation() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const theme = useUIStore((s) => s.theme)
  const toggleTheme = useUIStore((s) => s.toggleTheme)
  const [workspaceName, setWorkspaceName] = useState('Ghost Relay')
  const [notifOpen, setNotifOpen] = useState(false)

  const notifCount = useNotifStore((s) => s.unreadCount)
  const notifications = useNotifStore((s) => s.notifications)
  const initNotif = useNotifStore((s) => s.init)
  const markRead = useNotifStore((s) => s.markRead)
  const markAllRead = useNotifStore((s) => s.markAllRead)
  const fetchList = useNotifStore((s) => s.fetchList)
  const resetNotif = useNotifStore((s) => s.reset)

  useEffect(() => {
    api.get<{ name: string }>('/settings/workspace', { silent: true })
      .then(d => setWorkspaceName(d.name || 'Ghost Relay'))
      .catch(() => {})
    initNotif()
  }, [initNotif])

  const handleLogout = () => {
    resetNotif()
    disconnectSocket()
    api.post('/auth/sign-out', {}).catch(() => {})
    logout()
    navigate({ to: '/login' })
  }

  const toggleNotif = useCallback(() => {
    if (!notifOpen) {
      fetchList()
    }
    setNotifOpen((prev) => !prev)
  }, [notifOpen, fetchList])

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    if (!notifOpen) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-notif-dropdown]')) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notifOpen])

  if (!user) return null

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card/95 backdrop-blur-sm px-5 z-40 shrink-0">
      {/* Logo + Workspace */}
      <Link to="/chat" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity group">
        <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20 group-hover:ring-primary/40 transition-all">
          <Ghost className="h-4 w-4 text-primary" />
        </div>
        <span className="text-[13px] font-semibold text-foreground tracking-tight">
          {workspaceName}
        </span>
      </Link>

      {/* Nav Actions */}
      <div className="flex items-center gap-0.5">
        {/* Notification Bell */}
        <div className="relative" data-notif-dropdown>
          <button
            onClick={toggleNotif}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Notifikasi"
          >
            {notifCount > 0 ? (
              <>
                <BellRing className="h-4 w-4 text-primary" />
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground leading-none pulse-glow">
                  {notifCount > 99 ? '99+' : notifCount}
                </span>
              </>
            ) : (
              <Bell className="h-4 w-4" />
            )}
          </button>

          {/* Notification Dropdown */}
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-xl border border-border bg-popover shadow-2xl overflow-hidden fade-slide-in">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Bell className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Notifikasi</span>
                  {notifCount > 0 && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                      {notifCount}
                    </span>
                  )}
                </div>
                {notifCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] text-primary hover:underline font-medium"
                  >
                    Tandai dibaca
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-[340px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                    <Bell className="h-7 w-7 mx-auto mb-2 opacity-20" />
                    <p className="text-xs">Belum ada notifikasi</p>
                  </div>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        markRead(n.id)
                        if (n.link) navigate({ to: n.link })
                        setNotifOpen(false)
                      }}
                      className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-accent/40 transition-colors ${
                        !n.readAt ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {/* Unread dot */}
                        <div className={`mt-1 shrink-0 h-1.5 w-1.5 rounded-full ${
                          !n.readAt ? 'bg-primary pulse-glow' : 'bg-transparent'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {n.type === 'broadcast' ? '📢 ' : n.type === 'task' ? '📋 ' : '💬 '}
                            {n.title}
                          </p>
                          {n.message && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                              {n.message}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground/50 mt-1">
                            {formatTimeAgo(n.createdAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Footer — lihat semua */}
              <Link
                to="/notifications"
                onClick={() => setNotifOpen(false)}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-[11px] text-primary hover:bg-primary/5 transition-colors border-t border-border font-medium"
              >
                <ExternalLink className="h-3 w-3" />
                Lihat semua notifikasi
              </Link>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="mx-1 h-4 w-px bg-border" />

        {/* Admin shield (owner only) */}
        {user.role === 'owner' && (
          <Link to="/admin">
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-amber-500/70 hover:text-amber-500 hover:bg-amber-500/10 transition-colors" title="Admin">
              <Shield className="h-4 w-4" />
            </button>
          </Link>
        )}

        {/* Settings */}
        <Link to="/settings">
          <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="Settings">
            <Settings className="h-4 w-4" />
          </button>
        </Link>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Divider */}
        <div className="mx-1 h-4 w-px bg-border" />

        {/* User Avatar */}
        <Link to="/profile">
          <button className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors group" title={user.name}>
            <Avatar className="h-6 w-6 ring-1 ring-border group-hover:ring-primary/40 transition-all">
              <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                {user.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>
        </Link>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}

function formatTimeAgo(dateStr: string): string {
  try {
    const now = Date.now()
    const then = new Date(dateStr).getTime()
    const diff = now - then
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Baru saja'
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}j`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}h`
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}
