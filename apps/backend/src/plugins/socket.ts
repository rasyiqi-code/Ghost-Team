import { Server as SocketIOServer } from 'socket.io'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { decodeAccessToken } from '../core/security.js'

export async function socketPlugin(app: FastifyInstance): Promise<void> {
  const io = new SocketIOServer(app.server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    path: '/ws/socket.io',
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined
    if (!token) return next(new Error('Authentication required'))
    try {
      const payload = decodeAccessToken(token)
      socket.data.userId = Number(payload.sub)
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    const userId = socket.data.userId
    console.log(`Socket connected: ${socket.id} (user=${userId})`)
    socket.join(`user:${userId}`)
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`)
    })
  })

  app.decorate('io', io)
  app.decorate('emitToUser', (userId: number, event: string, data: unknown) => {
    io.to(`user:${userId}`).emit(event, data)
  })
}

declare module 'fastify' {
  interface FastifyInstance {
    io: SocketIOServer
    emitToUser: (userId: number, event: string, data: unknown) => void
  }
}

export default fp(socketPlugin, { name: 'socket' })
