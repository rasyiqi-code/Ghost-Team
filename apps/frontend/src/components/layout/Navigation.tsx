import { Link, useNavigate } from '@tanstack/react-router'
import { Ghost, Settings, LogOut, Moon, Sun, Shield, Bell, BellRing, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

  // Close dropdown on click outside
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
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <Link to="/chat" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <Ghost className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold text-foreground">{workspaceName}</span>
      </Link>
      <div className="flex items-center gap-1">
        {/* Notification Bell */}
        <div className="relative" data-notif-dropdown>
          <Button variant="ghost" size="icon" onClick={toggleNotif} className="relative">
            {notifCount > 0 ? (
              <>
                <BellRing className="h-5 w-5 text-primary" />
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground leading-none">
                  {notifCount > 99 ? '99+' : notifCount}
                </span>
              </>
            ) : (
              <Bell className="h-5 w-5" />
            )}
          </Button>

          {/* Dropdown */}
          {notifOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 w-80 rounded-lg border border-border bg-popover shadow-lg ring-1 ring-foreground/10 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-sm font-semibold text-foreground">Notifikasi</span>
                {notifCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-primary hover:underline"
                  >
                    Tandai semua dibaca
                  </button>
                )}
              </div>
              <div className="max-h-[360px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Belum ada notifikasi
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
                      className={`w-full text-left px-3 py-2.5 border-b border-border/50 hover:bg-accent/50 transition-colors ${
                        !n.readAt ? 'bg-accent/20' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`mt-0.5 shrink-0 h-2 w-2 rounded-full ${
                          !n.readAt ? 'bg-primary' : 'bg-transparent'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {n.type === 'broadcast' ? '📢 ' : n.type === 'task' ? '📋 ' : '💬 '}
                            {n.title}
                          </p>
                          {n.message && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {n.message}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            {formatTimeAgo(n.createdAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
              {/* Lihat semua link */}
              <Link
                to="/notifications"
                onClick={() => setNotifOpen(false)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-primary hover:bg-accent/50 transition-colors border-t border-border"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Lihat semua notifikasi
              </Link>
            </div>
          )}
        </div>

        {user.role === 'owner' && (
          <Link to="/admin">
            <Button variant="ghost" size="icon">
              <Shield className="h-5 w-5 text-amber-500" />
            </Button>
          </Link>
        )}
        <Link to="/settings">
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </Link>
        <Link to="/profile">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs">
                {user.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Button>
        </Link>
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
        </Button>
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
