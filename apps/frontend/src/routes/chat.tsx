import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import { ChatList } from '@/components/chat/ChatList'
import { ChatInput } from '@/components/chat/ChatInput'
import { ChannelList } from '@/components/sidebar/ChannelList'
import { KnowledgeVault } from '@/components/sidebar/KnowledgeVault'
import { useMessages, useSendMessage, useUploadVoice, useVoiceCommand } from '@/hooks/useMessages'
import { useSocketEvents } from '@/hooks/useSocketEvents'
import { VoiceRecorder } from '@/components/chat/VoiceRecorder'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react'


export const Route = createFileRoute('/chat')({
  component: ChatPage,
})

function ChatPage() {
  const [activeChannel, setActiveChannel] = useState('all')
  const [showRecorder, setShowRecorder] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessages(
    activeChannel !== 'all' ? activeChannel : undefined,
    searchQuery,
  )
  const messages = data?.pages.flatMap((p) => p.messages) ?? []

  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasNextPage) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) fetchNextPage()
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, fetchNextPage])

  const sendMutation = useSendMessage()
  const voiceMutation = useUploadVoice()
  const voiceCommandMutation = useVoiceCommand()
  useSocketEvents()

  const handleSend = (content: string) => {
    const platform = activeChannel === 'all' ? 'web' : activeChannel
    sendMutation.mutate({
      platform,
      receiver_id: platform === 'web' ? '' : '1',
      content,
    })
  }

  const handleVoice = async (blob: Blob) => {
    try {
      await voiceCommandMutation.mutateAsync(blob)
    } catch {
      voiceMutation.mutate(blob)
    }
    setShowRecorder(false)
  }

  return (
    <>
      <ChannelList activeId={activeChannel} onSelect={setActiveChannel} collapsed={leftCollapsed} />
      <div className="flex flex-1 flex-col">
        <div className="flex h-14 items-center justify-between border-b border-border bg-card px-4 gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLeftCollapsed(!leftCollapsed)}
              className="rounded-lg p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title={leftCollapsed ? "Buka Sidebar Kiri" : "Tutup Sidebar Kiri"}
            >
              {leftCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
            <h1 className="font-semibold text-foreground shrink-0">Main Chat</h1>
          </div>
          <div className="flex items-center gap-3 flex-1 max-w-md justify-end">
            <div className="flex-1 max-w-sm">
              <input
                type="text"
                placeholder="Cari pesan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full rounded-md border border-input bg-background px-3 text-xs outline-none focus-visible:border-ring"
              />
            </div>
            <button
              onClick={() => setRightCollapsed(!rightCollapsed)}
              className="rounded-lg p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title={rightCollapsed ? "Buka Sidebar Kanan" : "Tutup Sidebar Kanan"}
            >
              {rightCollapsed ? <PanelRightOpen className="h-5 w-5" /> : <PanelRightClose className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {isLoading ? (
          <div className="flex flex-1 flex-col gap-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`flex gap-3 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex flex-col gap-2 flex-1 max-w-[70%]">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className={`h-16 w-full ${i % 2 === 0 ? '' : 'ml-auto'}`} />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-1 items-center justify-center text-destructive">
            Gagal memuat pesan. Periksa koneksi server.
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-y-auto">
            <div ref={sentinelRef} className="h-4" />
            {isFetchingNextPage && (
              <div className="flex justify-center py-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            <ChatList messages={messages} />
          </div>
        )}
        {showRecorder ? (
          <div className="flex items-center justify-center gap-4 border-t border-border bg-card p-4">
            <VoiceRecorder onComplete={handleVoice} />
            <button
              onClick={() => setShowRecorder(false)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Batal
            </button>
          </div>
        ) : (
          <ChatInput
            onSend={handleSend}
            onVoiceRecord={() => setShowRecorder(true)}
          />
        )}
      </div>
      <KnowledgeVault collapsed={rightCollapsed} />
    </>
  )
}
