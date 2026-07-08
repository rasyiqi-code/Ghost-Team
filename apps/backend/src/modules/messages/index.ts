import type { FastifyInstance } from 'fastify'
import { setSocketIO, handleGetMessages, handleSendMessage, handleSearchMessages, handleClearMessages, handleDeleteMessage } from './handlers.js'

export async function messagesModule(app: FastifyInstance): Promise<void> {
  setSocketIO(app.io)

  app.get('/messages', { preHandler: [app.authenticate] }, handleGetMessages)
  app.post('/messages/send', { preHandler: [app.authenticate] }, handleSendMessage)
  app.post('/messages/search', { preHandler: [app.authenticate] }, handleSearchMessages)
  app.post('/messages/clear', { preHandler: [app.authenticate] }, handleClearMessages)
  app.delete('/messages/:id', { preHandler: [app.authenticate] }, handleDeleteMessage)
}
