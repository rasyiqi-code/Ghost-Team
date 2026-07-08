import type { FastifyRequest, FastifyReply } from 'fastify'
import { db } from '@ghost/database'

export async function handleGetNotifications(req: FastifyRequest) {
  const notifications = await db.notification.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      sender: { select: { id: true, name: true, email: true } },
    },
  })
  return notifications
}

export async function handleGetUnreadCount(req: FastifyRequest) {
  const count = await db.notification.count({
    where: { userId: req.userId, readAt: null },
  })
  return { count }
}

export async function handleMarkRead(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string }
  if (id === 'all') {
    await db.notification.updateMany({
      where: { userId: req.userId, readAt: null },
      data: { readAt: new Date() },
    })
    return { status: 'ok' }
  }
  const notification = await db.notification.findFirst({
    where: { id: Number(id), userId: req.userId },
  })
  if (!notification) {
    reply.status(404).send({ detail: 'Notification not found' })
    return
  }
  await db.notification.update({
    where: { id: Number(id) },
    data: { readAt: new Date() },
  })
  return { status: 'ok' }
}

export async function handleSendNotification(req: FastifyRequest, reply: FastifyReply) {
  const { userId: targetUserId, type, title, message, link } = req.body as {
    userId: string
    type?: string
    title: string
    message?: string
    link?: string
  }
  const targetUser = await db.user.findUnique({ where: { id: targetUserId } })
  if (!targetUser) {
    reply.status(404).send({ detail: 'Target user not found' })
    return
  }
  const notif = await db.notification.create({
    data: {
      userId: targetUserId,
      senderId: req.userId,
      type: type || 'info',
      title,
      message,
      link,
    },
  })
  const server = req.server
  if ((server as any).emitToUser) {
    ;(server as any).emitToUser(targetUserId, 'new_notification', notif)
  }
  return { status: 'ok', id: notif.id }
}
