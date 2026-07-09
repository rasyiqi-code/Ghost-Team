import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import type { Message as MessageType } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message'
import { Loader2, Trash2, Sparkles } from 'lucide-react'

interface ChannelMeta {
  id: string
  platform: string
  label: string
  color: string
}

const PLATFORM_BADGE: Record<string, string> = {
  whatsapp: 'border-emerald-500/20 bg-emerald-500/8 text-emerald-500',
  telegram: 'border-sky-500/20 bg-sky-500/8 text-sky-500',
  slack: 'border-violet-500/20 bg-violet-500/8 text-violet-500',
  web: 'border-primary/20 bg-primary/8 text-primary',
}

const PLATFORM_LABELS: Record<string, string> = {
  whatsapp: 'WA',
  telegram: 'TG',
  slack: 'SL',
  web: 'WEB',
}

interface ChatBubbleProps {
  message: MessageType
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const queryClient = useQueryClient()
  const [deleting, setDeleting] = useState(false)
  const { data: channels = [] } = useQuery<ChannelMeta[]>({
    queryKey: ['platform-meta'],
    queryFn: () => api.get('/settings/platforms/meta', { silent: true }),
    staleTime: 60000,
  })

  // Fetch workspace name
  const { data: workspace } = useQuery<{ name: string }>({
    queryKey: ['workspace'],
    queryFn: () => api.get('/settings/workspace', { silent: true }),
    staleTime: 300000,
  })

  const meta = channels.find((c) => c.platform === message.platform)
  const platformLabel = meta?.label || PLATFORM_LABELS[message.platform] || message.platform.toUpperCase()
  const platformBadgeClass = PLATFORM_BADGE[message.platform] || 'border-border bg-muted text-muted-foreground'

  const isOutgoing = message.isOutgoing
  const isAssistant = message.senderId === 'ai-assistant'
  const isVoiceNote = message.messageType === 'voice_note'
  const isProcessing = isVoiceNote && (message.content || '').toLowerCase().includes('processing')

  const handleDelete = async () => {
    if (!window.confirm('Hapus pesan ini?')) return
    setDeleting(true)
    try {
      await api.delete(`/messages/${message.id}`, { silent: true })
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      toast.success('Pesan berhasil dihapus')
    } catch {
      // error handled by api.ts
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className={cn('group relative flex flex-col gap-0.5', isOutgoing ? 'items-end' : 'items-start')}>

      {/* Sender label — hanya untuk incoming dari platform */}
      {!isOutgoing && !isAssistant && (
        <div className="flex items-center gap-1.5 px-1 mb-0.5">
          <span className="text-[11px] font-semibold text-foreground/70">
            {message.senderName}
          </span>
          <Badge
            variant="outline"
            className={cn('text-[9px] font-bold px-1.5 py-0 h-4 rounded uppercase tracking-wide', platformBadgeClass)}
          >
            {platformLabel}
          </Badge>
        </div>
      )}

      {/* AI sender label */}
      {isAssistant && (
        <div className="flex items-center gap-1.5 px-1 mb-0.5">
          <div className="flex h-4 w-4 items-center justify-center rounded bg-primary/10">
            <Sparkles className="h-2.5 w-2.5 text-primary" />
          </div>
          <span className="text-[11px] font-semibold text-primary">
            {workspace?.name || message.senderName}
          </span>
        </div>
      )}

      {/* Bubble row: delete + bubble */}
      <div className={cn('flex items-end gap-2 max-w-full', isOutgoing && 'flex-row-reverse')}>
        <Message from={isOutgoing ? 'user' : 'assistant'}>
          <MessageContent>
            {isProcessing ? (
              <span className="italic text-sm flex items-center gap-2 opacity-70">
                <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                {message.content}
              </span>
            ) : (
              <MessageResponse>{message.content}</MessageResponse>
            )}

            {/* RAG Source badges */}
            {isAssistant && message.ragSources && message.ragSources.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-primary/10">
                <span className="text-[9px] w-full font-medium uppercase tracking-wider opacity-40">Sumber</span>
                {message.ragSources.map((src) => (
                  <Badge
                    key={src}
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 h-4 border-primary/20 bg-primary/5 text-primary/70 font-normal"
                  >
                    {src}
                  </Badge>
                ))}
              </div>
            )}
          </MessageContent>
        </Message>

        {/* Delete button — muncul hover */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex h-5 w-5 items-center justify-center rounded text-muted-foreground/40 hover:text-destructive disabled:opacity-30 shrink-0"
          title="Hapus pesan"
        >
          {deleting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Trash2 className="h-3 w-3" />
          )}
        </button>
      </div>

      {/* Timestamp */}
      <span className={cn(
        'text-[10px] text-muted-foreground/35 px-1 opacity-0 group-hover:opacity-100 transition-opacity',
      )}>
        {new Date(message.timestamp).toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>
    </div>
  )
}
