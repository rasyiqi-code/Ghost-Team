import { io, type Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/authStore'

const SOCKET_URL = import.meta.env.VITE_API_URL || ''
const WS_PATH = import.meta.env.VITE_API_URL ? '' : '/ws'

let socket: Socket | null = null

export function connectSocket(): Socket | null {
  const token = useAuthStore.getState().token
  if (!token) return null

  if (socket?.connected) {
    const currentToken = (socket.auth as { token?: string })?.token
    if (currentToken === token) return socket
    socket.disconnect()
  }

  socket = io(SOCKET_URL, {
    path: `${WS_PATH}/socket.io`,
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  })

  socket.on('connect', () => {
    console.log('Socket connected')
  })

  socket.on('connect_error', (err) => {
    console.warn('Socket connection error:', err.message)
  })

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason)
  })

  return socket
}

export function getSocket(): Socket | null {
  return socket
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}

useAuthStore.subscribe((state, prev) => {
  if (state.token !== prev.token) {
    connectSocket()
  }
})

export type SocketEvents = {
  new_message: (data: unknown) => void
  voice_processed: (data: unknown) => void
  file_indexed: (data: unknown) => void
  auto_reply: (data: unknown) => void
  new_notification: (data: unknown) => void
  'whatsapp:qr': (data: { qr: string; qrDataUrl?: string; connectionId: number; message: string }) => void
  'whatsapp:ready': (data: { connectionId: number; phoneNumber: string }) => void
  'whatsapp:disconnected': (data: { connectionId: number; reason: string }) => void
}
