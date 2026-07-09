import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Bot, Layers, Search, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { TeamList } from './TeamList'

interface PlatformConnection {
  id: number
  platform: string
  platformUserId: string | null
  isActive: boolean
}

interface ChannelListProps {
  activeId?: string
  onSelect?: (id: string) => void
  collapsed?: boolean
  onNewSession?: () => void
}

// Warna platform yang konsisten
const PLATFORM_COLORS: Record<string, { dot: string; badge: string }> = {
  whatsapp: { dot: 'bg-emerald-500', badge: 'text-emerald-500 bg-emerald-500/10' },
  telegram: { dot: 'bg-sky-500', badge: 'text-sky-500 bg-sky-500/10' },
  slack: { dot: 'bg-violet-500', badge: 'text-violet-500 bg-violet-500/10' },
}

const DEFAULT_PLATFORM = { dot: 'bg-muted-foreground', badge: 'text-muted-foreground bg-muted' }

function getPlatformLabel(platform: string): string {
  const map: Record<string, string> = {
    whatsapp: 'WhatsApp',
    telegram: 'Telegram',
    slack: 'Slack',
  }
  return map[platform.toLowerCase()] || platform
}

function formatTimeShort(date: Date | string): string {
  try {
    const d = new Date(date)
    const now = Date.now()
    const diff = now - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Baru saja'
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}j`
    const days = Math.floor(hours / 24)
    return `${days}h`
  } catch {
    return ''
  }
}

export function ChannelList({ activeId = 'all', onSelect, collapsed, onNewSession }: ChannelListProps) {
  const [search, setSearch] = useState('')
  const { data: connections = [], isLoading, isError } = useQuery<PlatformConnection[]>({
    queryKey: ['platforms'],
    queryFn: () => api.get('/settings/platforms', { silent: true }),
    staleTime: 30000,
  })

  // Fetch riwayat percakapan AI (pesan user outgoing ke web)
  const { data: aiHistoryData } = useQuery<{
    messages: { id: string; content: string; timestamp: Date; isOutgoing: boolean }[]
  }>({
    queryKey: ['messages', 'web', undefined],
    queryFn: () => api.get('/messages?platform=web&page=1&page_size=20', { silent: true }),
    staleTime: 30000,
    enabled: !collapsed,
  })

  // Ambil hanya pesan outgoing user (bukan AI response) sebagai "topik" riwayat
  const aiHistory = (aiHistoryData?.messages ?? [])
    .filter((m) => m.isOutgoing)
    .slice(0, 5)

  const activeConnections = connections.filter((c: PlatformConnection) => c.isActive)
  const filteredConnections = activeConnections.filter(c =>
    (c.platformUserId || getPlatformLabel(c.platform)).toLowerCase().includes(search.toLowerCase())
  )
  const filteredAiHistory = aiHistory.filter(m =>
    m.content.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <aside className={cn(
      "hidden w-60 flex-col border-r border-border bg-sidebar md:flex transition-all duration-300 overflow-hidden shrink-0",
      collapsed && "w-0 border-r-0 md:w-0"
    )}>
      {/* Sticky Search & New Session Bar */}
      {!collapsed && (
        <div className="p-3 pb-2 flex items-center gap-2 border-b border-border bg-sidebar shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari obrolan..."
              className="h-8 w-full pl-8 pr-7 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/50"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          {onNewSession && (
            <button
              type="button"
              onClick={onNewSession}
              className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-all active:scale-95"
              title="Obrolan Baru"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">

        {/* === Saluran Tim === */}
        <div className="space-y-1">
          <div className="px-2 pb-1">
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase">
              Saluran
            </p>
          </div>
          <div className="space-y-0.5">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2">
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <Skeleton className="h-3 w-28" />
                </div>
              ))
            ) : isError ? (
              <div className="flex items-center gap-2 px-3 py-2 text-destructive/80">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="text-xs">Gagal memuat saluran</span>
              </div>
            ) : filteredConnections.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-muted-foreground/60 italic leading-relaxed">
                {search ? 'Saluran tidak ditemukan' : 'Belum ada saluran aktif. Hubungkan di Pengaturan.'}
              </div>
            ) : (
              filteredConnections.map((conn: PlatformConnection) => {
                const colors = PLATFORM_COLORS[conn.platform.toLowerCase()] || DEFAULT_PLATFORM
                const isActive = activeId === conn.platform
                return (
                  <button
                    key={conn.id}
                    onClick={() => onSelect?.(conn.platform)}
                    className={cn(
                      'sidebar-active-item flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-all duration-150',
                      isActive
                        ? 'bg-primary/8 text-primary font-semibold'
                        : 'text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground'
                    )}
                  >
                    {/* Status dot */}
                    <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', colors.dot)} />
                    <span className="truncate flex-1 text-[13px]">
                      {conn.platformUserId || getPlatformLabel(conn.platform)}
                    </span>
                    {/* Platform badge pill */}
                    <span className={cn(
                      'text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0',
                      colors.badge
                    )}>
                      {conn.platform.slice(0, 2)}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border/60 mx-1" />

        {/* === Anggota Tim === */}
        <TeamList collapsed={collapsed} searchQuery={search} />

        {/* Divider */}
        <div className="h-px bg-border/60 mx-1" />

        {/* === Asisten AI + History === */}
        <div className="space-y-1">
          <div className="space-y-0.5">
            {/* Tombol utama AI */}
            <button
              onClick={() => onSelect?.('web')}
              className={cn(
                'sidebar-active-item flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-all duration-150',
                activeId === 'web'
                  ? 'bg-primary/8 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground'
              )}
            >
              <Bot className={cn("h-4 w-4 shrink-0", activeId === 'web' ? 'text-primary' : 'text-muted-foreground')} />
              <span className="flex-1 truncate">AI Assistant</span>
              {/* Online indicator */}
              <span
                className="h-1.5 w-1.5 rounded-full bg-primary shrink-0"
                style={{ boxShadow: '0 0 6px oklch(0.6 0.22 264 / 70%)' }}
              />
            </button>

            {/* Riwayat percakapan AI */}
            {filteredAiHistory.length > 0 && (
              <div className="pl-2 mt-1 space-y-0.5">
                {filteredAiHistory.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => onSelect?.('web')}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left transition-colors hover:bg-sidebar-accent/50 group"
                    title={msg.content}
                  >
                    {/* Garis kiri penanda riwayat */}
                    <div className="h-3 w-px bg-border/80 shrink-0 group-hover:bg-primary/30 transition-colors" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-muted-foreground/70 truncate leading-tight group-hover:text-muted-foreground transition-colors">
                        {msg.content}
                      </p>
                    </div>
                    <span className="text-[9px] text-muted-foreground/40 shrink-0">
                      {formatTimeShort(msg.timestamp)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
