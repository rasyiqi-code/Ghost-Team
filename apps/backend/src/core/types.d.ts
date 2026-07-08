import type { Db } from '@ghost/database'
import type { Server as SocketIOServer } from 'socket.io'
import type { AppEventBus } from './event-bus.js'
import type { TaskQueue } from './task-queue.js'

declare module 'fastify' {
  interface FastifyInstance {
    db: Db
    io: SocketIOServer
    eventBus: AppEventBus
    taskQueue: TaskQueue
  }
  interface FastifyRequest {
    userId: string
  }
}
