import { useEffect, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChatBubble } from './ChatBubble'
import type { Message } from '@/types'

interface ChatListProps {
  messages: Message[]
}

export function ChatList({ messages }: ChatListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <p>Belum ada pesan. Mulai ngobrol!</p>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1 px-4">
      <div className="flex flex-col gap-3 py-4">
        {[...messages].reverse().map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}
