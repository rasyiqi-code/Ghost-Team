import { Server as SocketIOServer } from 'socket.io'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { auth } from '../core/auth.js'

const userSockets = new Map<string, Set<string>>()

export async function socketPlugin(app: FastifyInstance): Promise<void> {
  const io = new SocketIOServer(app.server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    path: '/ws/socket.io',
  })

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined
    if (!token) return next(new Error('Authentication required'))
    try {
      const session = await auth.api.getSession({
        headers: {
          authorization: `Bearer ${token}`
        }
      })
      if (!session) {
        return next(new Error('Invalid token'))
      }
      socket.data.userId = session.user.id
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    const userId = socket.data.userId
    console.log(`Socket connected: ${socket.id} (user=${userId})`)

    // Track sockets per user
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set())
      // First connection for this user — notify others
      socket.broadcast.emit('user:online', userId)
    }
    userSockets.get(userId)!.add(socket.id)

    socket.join(`user:${userId}`)

    // Send current online list to newly connected client
    const onlineUsers = Array.from(userSockets.keys())
    socket.emit('user:online_list', onlineUsers)

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`)
      const sockets = userSockets.get(userId)
      if (sockets) {
        sockets.delete(socket.id)
        if (sockets.size === 0) {
          userSockets.delete(userId)
          // Last socket for this user — notify others
          io.emit('user:offline', userId)
        }
      }
    })
  })

  app.decorate('io', io)
  app.decorate('emitToUser', (userId: string, event: string, data: unknown) => {
    io.to(`user:${userId}`).emit(event, data)
  })
}

declare module 'fastify' {
  interface FastifyInstance {
    io: SocketIOServer
    emitToUser: (userId: string, event: string, data: unknown) => void
  }
}

export default fp(socketPlugin, { name: 'socket' })
