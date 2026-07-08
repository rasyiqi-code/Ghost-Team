import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Users } from 'lucide-react'

interface Member {
  id: string
  name: string
  email: string
  image: string | null
  role: string
  platformRole?: string
  joinedAt: string
}

export function TeamList({ collapsed }: { collapsed?: boolean }) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    api.get<{ workspaceName: string; members: Member[]; myRole: string }>('/settings/workspace/members', { silent: true })
      .then(data => setMembers(data.members))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const handleOnline = (userId: string) => setOnlineIds(prev => new Set(prev).add(userId))
    const handleOffline = (userId: string) => {
      setOnlineIds(prev => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
    const s = getSocket()
    if (!s) return
    const handleOnlineList = (userIds: string[]) => setOnlineIds(new Set(userIds))
    s.on('user:online_list', handleOnlineList)
    s.on('user:online', handleOnline)
    s.on('user:offline', handleOffline)
    return () => {
      s.off('user:online_list', handleOnlineList)
      s.off('user:online', handleOnline)
      s.off('user:offline', handleOffline)
    }
  }, [])

  if (collapsed) return null

  return (
    <div className="space-y-2">
      <div className="px-3">
        <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
          <Users className="h-3 w-3" />
          Tim
        </p>
      </div>
      <div className="space-y-1">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))
        ) : members.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground italic">
            Undang rekan tim via tautan invite
          </div>
        ) : (
          members.map(m => (
            <div
              key={m.id}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 transition-colors"
            >
              <div className="relative shrink-0">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px]">{m.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${
                  onlineIds.has(m.id) ? 'bg-green-500' : 'bg-muted'
                }`} />
              </div>
              <span className="flex-1 truncate text-xs">{m.name}</span>
              {m.platformRole === 'owner' && (
                <span className="text-[10px] text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30 px-1.5 py-0.5 rounded uppercase font-semibold shrink-0">
                  Owner
                </span>
              )}
              {m.role === 'admin' && m.platformRole !== 'owner' && (
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase font-semibold shrink-0">
                  Admin
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
