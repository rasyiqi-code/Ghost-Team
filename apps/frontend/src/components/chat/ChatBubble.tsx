import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import type { Message as MessageType } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message'
import { Loader2, Trash2 } from 'lucide-react'

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

  const meta = channels.find((c) => c.platform === message.platform)
  const platformColor = meta
    ? meta.color.replace('bg-', '').replace('-500', '') + '-500'
    : 'gray-500'
  const platformLabel = meta?.label || defaultLabels[message.platform] || message.platform.toUpperCase()
  const isOutgoing = message.isOutgoing
  const isAssistant = message.senderId === 'ai-assistant'
  const isVoiceNote = message.messageType === 'voice_note'
  const isProcessing =
    isVoiceNote && (message.content || '').toLowerCase().includes('processing')
  const isVoiceProcessed = message.messageType === 'voice_processed'

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
    <div className="group relative">
      {/* Delete button — muncul saat hover */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-1 hover:bg-accent text-muted-foreground hover:text-destructive disabled:opacity-30"
        title="Hapus pesan"
      >
        {deleting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </button>
      <Message
        from={isOutgoing ? 'user' : 'assistant'}
        className={cn(isVoiceNote && 'opacity-80')}
      >
      {/* Platform badge + sender name untuk incoming */}
      {!isOutgoing && !isAssistant && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs font-semibold text-muted-foreground">
            {message.senderName}
          </span>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px]',
              defaultColors[message.platform] ||
                `bg-${platformColor}/10 text-${platformColor} border-${platformColor}/30`
            )}
          >
            [{platformLabel}]
          </Badge>
        </div>
      )}

      {/* AI assistant label */}
      {isAssistant && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs font-semibold text-primary">
            🤖 {message.senderName}
          </span>
        </div>
      )}

      <MessageContent>
        {isProcessing ? (
          <span className="italic text-muted-foreground text-sm">
            {message.content}
          </span>
        ) : isVoiceProcessed ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
          </div>
        ) : isAssistant ? (
          <MessageResponse>{message.content}</MessageResponse>
        ) : (
          <MessageResponse>{message.content}</MessageResponse>
        )}

        {/* RAG Source badges */}
        {isAssistant && message.ragSources && message.ragSources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {message.ragSources.map((src) => (
              <Badge
                key={src}
                variant="outline"
                className="text-[10px] px-2 py-0.5 border-indigo-200 bg-indigo-50 text-indigo-600"
              >
                📄 {src}
              </Badge>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-muted-foreground/60 self-end mt-1">
          {new Date(message.timestamp).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </MessageContent>
      </Message>
    </div>
  )
}
