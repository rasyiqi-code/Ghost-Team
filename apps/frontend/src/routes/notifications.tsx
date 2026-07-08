import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, BellRing, CheckCheck, ArrowLeft, Loader2, AlertCircle, Inbox, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import type { Notification } from '@/types'

const NOTIF_TYPES = [
  { value: '', label: 'Semua', icon: '🔔' },
  { value: 'direct', label: 'Pesan', icon: '💬' },
  { value: 'broadcast', label: 'Pengumuman', icon: '📢' },
  { value: 'task', label: 'Tugas', icon: '📋' },
] as const

function getNotifIcon(type: string): string {
  switch (type) {
    case 'broadcast': return '📢'
    case 'task': return '📋'
    default: return '💬'
  }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    const now = Date.now()
    const diff = now - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Baru saja'
    if (mins < 60) return `${mins}m yang lalu`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}j yang lalu`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}h yang lalu`
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export const Route = createFileRoute('/notifications')({
  component: NotificationsPage,
})

function NotificationsPage() {
  const queryClient = useQueryClient()
  const [filterType, setFilterType] = useState('')
  const [markingAll, setMarkingAll] = useState(false)
  const [markingIds, setMarkingIds] = useState<Set<number>>(new Set())

  const { data: notifications = [], isLoading, isError } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications', { silent: true }),
    refetchOnWindowFocus: true,
  })

  const filtered = filterType
    ? notifications.filter((n) => n.type === filterType)
    : notifications

  const unreadCount = notifications.filter((n) => !n.readAt).length
  const filteredUnreadCount = filtered.filter((n) => !n.readAt).length

  const handleMarkRead = useCallback(async (id: number) => {
    setMarkingIds((prev) => new Set(prev).add(id))
    try {
      await api.post(`/notifications/${id}/read`, {}, { silent: true })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    } catch { /* noop */ }
    setMarkingIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [queryClient])

  const handleMarkAllRead = useCallback(async () => {
    setMarkingAll(true)
    try {
      await api.post('/notifications/all/read', {}, { silent: true })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    } catch { /* noop */ }
    setMarkingAll(false)
  }, [queryClient])

  return (
    <div className="flex flex-1 flex-col bg-background">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
        <div className="flex items-center gap-3">
          <Link
            to="/chat"
            className="rounded-lg p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-semibold text-foreground flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notifikasi
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs font-normal">
                {unreadCount} belum dibaca
              </Badge>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="text-xs gap-1.5"
            >
              {markingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5" />
              )}
              Tandai semua dibaca
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-card/50">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex gap-1 flex-wrap">
          {NOTIF_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setFilterType(t.value)}
              className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                filterType === t.value
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {t.value === '' ? (
                <span className={`text-[10px] ml-0.5 ${filterType === '' ? 'opacity-80' : 'text-muted-foreground'}`}>
                  {unreadCount}
                </span>
              ) : (
                (() => {
                  const count = notifications.filter((n) => n.type === t.value && !n.readAt).length
                  return count > 0 ? (
                    <span className={`text-[10px] ml-0.5 ${filterType === t.value ? 'opacity-80' : 'text-muted-foreground'}`}>
                      {count}
                    </span>
                  ) : null
                })()
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">Memuat notifikasi...</span>
            </div>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <AlertCircle className="h-8 w-8" />
              <span className="text-sm">Gagal memuat notifikasi</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Inbox className="h-12 w-12 opacity-30" />
              <span className="text-sm font-medium">
                {filterType ? 'Tidak ada notifikasi tipe ini' : 'Belum ada notifikasi'}
              </span>
              <p className="text-xs text-muted-foreground/60">
                Notifikasi dari AI dan anggota tim akan muncul di sini
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-6 py-4 transition-colors hover:bg-accent/30 ${
                  !n.readAt ? 'bg-accent/10' : ''
                }`}
              >
                {/* Unread indicator */}
                <div className="mt-1.5 shrink-0">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      !n.readAt ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-base leading-none" role="img" aria-label={n.type}>
                          {getNotifIcon(n.type)}
                        </span>
                        <span className="text-sm font-semibold text-foreground truncate">
                          {n.title}
                        </span>
                        {n.sender && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            dari <span className="font-medium">{n.sender.name}</span>
                          </span>
                        )}
                      </div>
                      {n.message && (
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed whitespace-pre-wrap">
                          {n.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground/50 mt-1.5">
                        {formatDate(n.createdAt)}
                        {n.readAt && (
                          <span className="ml-3 text-primary/60">
                            ✓ Dibaca {formatDate(n.readAt)}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {n.type && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize ${
                            n.type === 'broadcast'
                              ? 'border-amber-200 text-amber-600 bg-amber-50/50'
                              : n.type === 'task'
                              ? 'border-blue-200 text-blue-600 bg-blue-50/50'
                              : 'border-green-200 text-green-600 bg-green-50/50'
                          }`}
                        >
                          {n.type === 'broadcast' ? '📢 Pengumuman' : n.type === 'task' ? '📋 Tugas' : '💬 Pesan'}
                        </Badge>
                      )}
                      {!n.readAt && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleMarkRead(n.id)}
                          disabled={markingIds.has(n.id)}
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                          title="Tandai dibaca"
                        >
                          {markingIds.has(n.id) ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCheck className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer stats */}
      {filtered.length > 0 && !isLoading && (
        <div className="border-t border-border bg-card px-6 py-2">
          <p className="text-xs text-muted-foreground text-center">
            Menampilkan {filtered.length} notifikasi
            {filterType ? ` (tipe: ${filterType})` : ''}
            {filteredUnreadCount > 0 && ` · ${filteredUnreadCount} belum dibaca`}
          </p>
        </div>
      )}
    </div>
  )
}
