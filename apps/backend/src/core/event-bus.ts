import { EventEmitter } from 'node:events'

export interface MessageCreatedEvent {
  id: number
  userId: number
  platform: string
  content: string | null
  senderName: string | null
  messageType: string
  isOutgoing: boolean
  timestamp: string
}

export interface VoiceProcessedEvent {
  id: number
  status: string
  transcription?: string
  summary?: string
}

export interface FileIndexedEvent {
  fileId: number
  status: string
  folder?: string
}

export interface AutoReplyEvent {
  status: string
  answer: string | null
  source: string
  sender: string
  platform: string
  originalQuestion: string
}

class AppEventBus {
  private emitter = new EventEmitter()

  on(event: 'message:created', handler: (data: MessageCreatedEvent) => void): void
  on(event: 'voice:processed', handler: (data: VoiceProcessedEvent) => void): void
  on(event: 'file:indexed', handler: (data: FileIndexedEvent) => void): void
  on(event: 'auto:reply', handler: (data: AutoReplyEvent) => void): void
  on(event: string, handler: (data: any) => void): void {
    this.emitter.on(event, handler)
  }

  emit(event: 'message:created', data: MessageCreatedEvent): void
  emit(event: 'voice:processed', data: VoiceProcessedEvent): void
  emit(event: 'file:indexed', data: FileIndexedEvent): void
  emit(event: 'auto:reply', data: AutoReplyEvent): void
  emit(event: string, data: unknown): void {
    this.emitter.emit(event, data)
  }
}

export const eventBus = new AppEventBus()
