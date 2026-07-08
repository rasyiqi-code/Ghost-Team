import type { FastifyInstance } from 'fastify'
import {
  handleGetNotifications,
  handleGetUnreadCount,
  handleMarkRead,
  handleSendNotification,
} from './handlers.js'

export async function notificationsModule(app: FastifyInstance): Promise<void> {
  app.get('/notifications', { preHandler: [app.authenticate] }, handleGetNotifications)
  app.get('/notifications/unread-count', { preHandler: [app.authenticate] }, handleGetUnreadCount)
  app.post('/notifications/:id/read', { preHandler: [app.authenticate] }, handleMarkRead)
  app.post('/notifications/send', { preHandler: [app.authenticate] }, handleSendNotification)
}
