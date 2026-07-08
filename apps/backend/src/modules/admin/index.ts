import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { db } from '@ghost/database'

async function authAndOwner(req: FastifyRequest, reply: FastifyReply) {
  const user = await db.user.findUnique({ where: { id: req.userId } })
  if (!user) {
    reply.status(401).send({ detail: 'Invalid or expired session' })
    return
  }
  if (user.role !== 'owner') {
    reply.status(403).send({ detail: 'Platform owner access required' })
    return
  }
}

export async function adminModule(app: FastifyInstance): Promise<void> {
  // Untuk owner login: cek role user (hanya auth, tanpa requireOwner)
  app.get('/admin/check', { preHandler: [app.authenticate] }, async (req: FastifyRequest) => {
    const user = await db.user.findUnique({ where: { id: req.userId } })
    return { role: user?.role ?? 'user' }
  })

  app.get('/admin/workspaces', { preHandler: [app.authenticate, authAndOwner] }, async () => {
    const workspaces = await db.workspace.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return {
      workspaces: workspaces.map(w => ({
        id: w.id,
        name: w.name,
        owner: w.owner,
        memberCount: w._count.members,
        inviteCode: w.inviteCode,
        createdAt: w.createdAt,
      })),
    }
  })

  app.get('/admin/users', { preHandler: [app.authenticate, authAndOwner] }, async () => {
    const users = await db.user.findMany({
      include: { _count: { select: { memberships: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return {
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        workspaceCount: u._count.memberships,
        createdAt: u.createdAt,
      })),
    }
  })
}
