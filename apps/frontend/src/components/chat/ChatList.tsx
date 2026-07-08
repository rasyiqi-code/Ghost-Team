import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from '@/components/ai-elements/conversation'
import { ChatBubble } from './ChatBubble'
import type { Message } from '@/types'

interface ChatListProps {
  messages: Message[]
}

export function ChatList({ messages }: ChatListProps) {
  if (messages.length === 0) {
    return (
      <ConversationEmptyState
        title="Belum ada pesan"
        description="Mulai ngobrol dengan tim kamu! Kirim pesan atau gunakan voice note."
      />
    )
  }

  return (
    <Conversation>
      <ConversationContent>
        {[...messages].reverse().map((message) => (
          <div key={message.id} id={`message-${message.id}`}>
            <ChatBubble message={message} />
          </div>
        ))}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  )
}
