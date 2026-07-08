import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Bot, Layers } from 'lucide-react'
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
}

export function ChannelList({ activeId = 'all', onSelect, collapsed }: ChannelListProps) {
  const { data: connections = [], isLoading, isError } = useQuery<PlatformConnection[]>({
    queryKey: ['platforms'],
    queryFn: () => api.get('/settings/platforms', { silent: true }),
    staleTime: 30000,
  })

  // Map platform code to display options
  const getPlatformLabel = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'whatsapp':
        return 'WhatsApp'
      case 'telegram':
        return 'Telegram'
      case 'slack':
        return 'Slack'
      default:
        return platform
    }
  }

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'whatsapp':
        return 'bg-green-500'
      case 'telegram':
        return 'bg-blue-500'
      case 'slack':
        return 'bg-purple-500'
      default:
        return 'bg-muted'
    }
  }

  // Filter active connections
  const activeConnections = connections.filter((c: PlatformConnection) => c.isActive)

  return (
    <aside className={cn(
      "hidden w-64 flex-col border-r border-border bg-card md:flex transition-all duration-300 overflow-hidden shrink-0",
      collapsed && "w-0 border-r-0 md:w-0"
    )}>
      {/* Sidebar Header */}
      <div className="flex h-14 items-center border-b border-border px-3">
        <button
          onClick={() => onSelect?.('all')}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-all duration-150',
            activeId === 'all'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
          )}
        >
          <Layers className="h-4 w-4 shrink-0" />
          <span>Semua Pesan</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-6">

        {/* Dynamic Channels Section */}
        <div className="space-y-2">
          <div className="px-3">
            <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Saluran Tim
            </p>
          </div>
          <div className="space-y-1">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2">
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))
            ) : isError ? (
              <div className="flex items-center gap-2 px-3 py-3 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs">Gagal memuat saluran</span>
              </div>
            ) : activeConnections.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground italic">
                Belum ada saluran aktif. Hubungkan di menu Pengaturan.
              </div>
            ) : (
              activeConnections.map((conn: PlatformConnection) => (
                <button
                  key={conn.id}
                  onClick={() => onSelect?.(conn.platform)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-all duration-150',
                    activeId === conn.platform
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                  )}
                >
                  <span className={cn('h-2 w-2 rounded-full shrink-0', getPlatformColor(conn.platform))} />
                  <span className="truncate flex-1">
                    {conn.platformUserId || getPlatformLabel(conn.platform)}
                  </span>
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase font-semibold shrink-0">
                    {conn.platform.slice(0, 2)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Team Members Section */}
        <TeamList collapsed={collapsed} />

        {/* AI Assistant History Section */}
        <div className="space-y-2">
          <div className="px-3">
            <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Asisten AI & Riwayat
            </p>
          </div>
          <div className="space-y-1">
            <button
              onClick={() => onSelect?.('web')}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-150',
                activeId === 'web'
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              )}
            >
              <Bot className="h-4.5 w-4.5 shrink-0 text-primary" />
              <span className="flex-1 truncate">Percakapan AI</span>
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
