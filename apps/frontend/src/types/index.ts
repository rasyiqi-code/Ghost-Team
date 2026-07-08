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
  ragSources?: string[]
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
  extractedText?: string
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
  id: number
  userId?: string
  platform: string
  isActive: boolean
  platformUserId: string | null
}

export interface User {
  id: string
  email: string
  name: string
  role?: string
}

/** Provider AI yang tersimpan di database */
export interface AIProvider {
  id: number
  userId: number
  providerType: string
  name: string
  apiBaseUrl: string
  apiKey: string
  modelId: string
  isActive: boolean
  scope: 'personal' | 'workspace' | 'global'
}

/** Entry dari katalog models.dev */
export interface CatalogProvider {
  id: string
  name: string
  api: string
  models: string[]
}

/** Hasil autocomplete dari katalog (base URLs & models) */
export interface ModelsCatalog {
  providers: CatalogProvider[]
}

/** Form state untuk tambah AI provider */
export interface AIProviderForm {
  providerType: string
  name: string
  apiBaseUrl: string
  apiKey: string
  modelId: string
  scope: 'personal' | 'workspace' | 'global'
}

/** Notifikasi dari anggota tim / AI */
export interface Notification {
  id: number
  userId: string
  senderId: string
  type: string
  title: string
  message: string | null
  link: string | null
  readAt: string | null
  createdAt: string
  sender?: {
    id: string
    name: string
    email: string
  }
}
