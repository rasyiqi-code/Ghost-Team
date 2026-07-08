import { Mic } from 'lucide-react'
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputFooter,
  PromptInputTools,
  PromptInputButton,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
  PromptInputActionAddScreenshot,
} from '@/components/ai-elements/prompt-input'
import { cn } from '@/lib/utils'
import type { PromptInputMessage } from '@/components/ai-elements/prompt-input'
import type { ChatStatus } from 'ai'

interface ChatInputProps {
  onSend: (content: string) => void
  onVoiceRecord: () => void
  isRecording?: boolean
  /** Streaming status — ketika tidak undefined, tombol submit menampilkan state streaming */
  streamingStatus?: ChatStatus
  /** Callback untuk menghentikan streaming */
  onStopStreaming?: () => void
}

export function ChatInput({
  onSend,
  onVoiceRecord,
  isRecording = false,
  streamingStatus,
  onStopStreaming,
}: ChatInputProps) {
  const handleSubmit = (message: PromptInputMessage) => {
    const trimmed = message.text.trim()
    if (!trimmed && message.files.length === 0) return
    if (trimmed) onSend(trimmed)
  }

  return (
    <div className="border-t border-border bg-card">
      <PromptInput
        onSubmit={handleSubmit}
        multiple
        maxFiles={5}
        maxFileSize={10 * 1024 * 1024} // 10MB
      >
        <PromptInputBody>
          <PromptInputTextarea
            placeholder="Ketik pesan... (Enter untuk kirim, Shift+Enter untuk baris baru)"
          />
        </PromptInputBody>

        <PromptInputFooter>
          <PromptInputTools>
            <PromptInputButton
              onClick={onVoiceRecord}
              tooltip={{
                content: isRecording ? 'Stop recording' : 'Voice note',
                shortcut: '⌘M',
              }}
              className={cn(isRecording && 'text-destructive')}
            >
              <Mic className="size-4" />
            </PromptInputButton>

            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger tooltip="Add files" />
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments label="Upload file" />
                <PromptInputActionAddScreenshot label="Take screenshot" />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>
          </PromptInputTools>

          <PromptInputTools>
            <PromptInputSubmit
              status={streamingStatus}
              onStop={onStopStreaming}
            />
          </PromptInputTools>
        </PromptInputFooter>
      </PromptInput>
    </div>
  )
}
