export interface Message {
  id: string
  userId: string
  platform: string
  senderId: string
  senderName: string
  content: string
  messageType: string
  timestamp: Date
  isOutgoing: boolean
}

export interface MessageListResponse {
  messages: Message[]
  total: number
  page: number
  pageSize: number
}

export interface File {
  id: string
  userId: string
  originalName: string
  storageUrl: string
  fileType: string
  folder: string
  sizeBytes: number
  uploadedAt: Date
}

export interface VoiceNote {
  messageId: string
  audioUrl: string
  transcription: string
  summary: string
  tasks: string[]
  deadline: Date | null
  processedAt: Date
}

export interface PlatformConnection {
  id: string
  userId: string
  platform: string
  isActive: boolean
}

export interface User {
  id: string
  email: string
  name: string
}
