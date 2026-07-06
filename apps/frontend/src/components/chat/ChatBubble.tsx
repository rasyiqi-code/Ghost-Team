import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import type { Message } from '@/types'
import { Badge } from '@/components/ui/badge'

interface ChannelMeta {
  id: string
  platform: string
  label: string
  color: string
}

const defaultColors: Record<string, string> = {
  whatsapp: 'bg-green-500/10 text-green-500 border-green-500/30',
  telegram: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  slack: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  web: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
}

const defaultLabels: Record<string, string> = {
  whatsapp: 'WA',
  telegram: 'TG',
  slack: 'SLACK',
  web: 'WEB',
}

interface ChatBubbleProps {
  message: Message
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const { data: channels = [] } = useQuery<ChannelMeta[]>({
    queryKey: ['platform-meta'],
    queryFn: () => api.get('/settings/platforms/meta'),
    staleTime: 60000,
  })

  const meta = channels.find((c) => c.platform === message.platform)
  const platformColor = meta
    ? meta.color.replace('bg-', '').replace('-500', '') + '-500'
    : 'gray-500'
  const platformLabel = meta?.label || defaultLabels[message.platform] || message.platform.toUpperCase()
  const isOutgoing = message.isOutgoing
  const isVoiceNote = message.messageType === 'voice_note'
  const isProcessing =
    isVoiceNote && (message.content || '').toLowerCase().includes('processing')

  return (
    <div
      className={cn(
        'flex w-full',
        isOutgoing ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'flex flex-col gap-1 rounded-lg px-4 py-2 max-w-[75%]',
          isOutgoing
            ? 'bg-primary text-primary-foreground'
            : 'bg-card text-card-foreground border border-border'
        )}
      >
        {!isOutgoing && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              {message.senderName}
            </span>
            <Badge
              variant="outline"
              className={cn(
                'text-xs',
                defaultColors[message.platform] ||
                  `bg-${platformColor}/10 text-${platformColor} border-${platformColor}/30`
              )}
            >
              [{platformLabel}]
            </Badge>
          </div>
        )}
        <p className="text-sm whitespace-pre-wrap break-words">
          {isProcessing ? (
            <span className="italic text-muted-foreground">
              {message.content}
            </span>
          ) : (
            message.content
          )}
        </p>
        <span className="text-xs text-muted-foreground self-end">
          {new Date(message.timestamp).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  )
}
