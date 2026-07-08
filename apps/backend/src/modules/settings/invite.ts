import type { FastifyRequest, FastifyReply } from 'fastify'
import { randomBytes } from 'node:crypto'
import { db } from '@ghost/database'
import { setSetting, getSetting } from '../../core/db-settings.js'

async function getOrCreateWorkspace(userId: string): Promise<{ id: string; inviteCode: string; name: string }> {
  let ws = await db.workspace.findUnique({ where: { ownerId: userId } })
  if (!ws) {
    const name = (await getSetting('workspace_name', 'Ghost Relay')) ?? 'Ghost Relay'
    const code = randomBytes(16).toString('hex')
    ws = await db.workspace.create({
      data: { name, ownerId: userId, inviteCode: code },
    })
    await db.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: ws.id, userId } },
      create: { workspaceId: ws.id, userId, role: 'admin' },
      update: {},
    })
    await setSetting('workspace_invite_code', code)
  }
  return ws
}

export async function handleGenerateInvite(req: FastifyRequest, reply: FastifyReply) {
  const ws = await getOrCreateWorkspace(req.userId)
  return { code: ws.inviteCode }
}

export async function handleRegenerateInvite(req: FastifyRequest, reply: FastifyReply) {
  const newCode = randomBytes(16).toString('hex')
  const ws = await getOrCreateWorkspace(req.userId)
  await db.workspace.update({ where: { id: ws.id }, data: { inviteCode: newCode } })
  await setSetting('workspace_invite_code', newCode)
  return { code: newCode }
}

export async function handleGetInviteInfo(req: FastifyRequest, reply: FastifyReply) {
  const { code } = req.params as { code: string }
  const ws = await db.workspace.findUnique({ where: { inviteCode: code } })
  if (!ws) {
    // Fallback ke settings (legacy)
    const stored = await getSetting('workspace_invite_code')
    if (!stored || stored !== code) {
      reply.status(404).send({ detail: 'Invite code not found or expired' })
      return
    }
    const name = await getSetting('workspace_name', '')
    const purpose = await getSetting('workspace_purpose', '')
    const context = await getSetting('workspace_context', '')
    return { valid: true, workspaceName: name, workspacePurpose: purpose, workspaceContext: context }
  }
  const purpose = await getSetting('workspace_purpose', '')
  const context = await getSetting('workspace_context', '')
  return { valid: true, workspaceName: ws.name, workspacePurpose: purpose, workspaceContext: context }
}

export async function handleAcceptInvite(req: FastifyRequest, reply: FastifyReply) {
  const { code } = req.body as { code: string }
  const ws = await db.workspace.findUnique({ where: { inviteCode: code } })
  if (!ws) {
    reply.status(404).send({ detail: 'Invite code not found or expired' })
    return
  }
  const existing = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: ws.id, userId: req.userId } },
  })
  if (existing) return { status: 'already_member' }
  await db.workspaceMember.create({
    data: { workspaceId: ws.id, userId: req.userId, role: 'member' },
  })
  return { status: 'ok', workspaceName: ws.name }
}

export async function handleListMembers(req: FastifyRequest, reply: FastifyReply) {
  let ws = await db.workspace.findUnique({ where: { ownerId: req.userId } })
  if (!ws) {
    ws = await db.workspace.findFirst({
      where: { members: { some: { userId: req.userId } } },
    })
  }
  if (!ws) return { workspaceName: '', members: [], myRole: '' }
  const members = await db.workspaceMember.findMany({
    where: { workspaceId: ws.id },
    include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } },
    orderBy: { joinedAt: 'asc' },
  })
  const myMembership = members.find(m => m.userId === req.userId)
  return {
    workspaceName: ws.name,
    myRole: myMembership?.role ?? '',
    members: members.map(m => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
      role: m.role,
      platformRole: m.user.role,
      joinedAt: m.joinedAt,
    })),
  }
}
