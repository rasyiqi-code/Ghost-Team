import { useState, type FormEvent } from 'react'
import { Send, Mic } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (content: string) => void
  onVoiceRecord: () => void
  isRecording?: boolean
}

export function ChatInput({
  onSend,
  onVoiceRecord,
  isRecording = false,
}: ChatInputProps) {
  const [content, setContent] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) return
    onSend(trimmed)
    setContent('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 border-t border-border bg-card p-4"
    >
      <Button
        type="button"
        size="icon"
        variant={isRecording ? 'destructive' : 'default'}
        onClick={onVoiceRecord}
        className={cn('h-10 w-10 rounded-full', isRecording && 'animate-pulse')}
      >
        <Mic className="h-5 w-5" />
      </Button>
      <Input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Ketik pesan..."
        className="flex-1"
      />
      <Button type="submit" size="icon" disabled={!content.trim()}>
        <Send className="h-5 w-5" />
      </Button>
    </form>
  )
}
