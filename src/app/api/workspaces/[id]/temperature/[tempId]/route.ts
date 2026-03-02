import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess, canEdit } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'

export const DELETE = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId, tempId } = await params
    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access || !canEdit(access.role)) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const existing = await prisma.temperatureLog.findFirst({ where: { id: tempId, workspaceId, deletedAt: null } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.temperatureLog.update({ where: { id: tempId }, data: { deletedAt: new Date() } })

    await prisma.auditLog.create({
      data: {
        workspaceId, userId: req.session.user.id,
        action: 'DELETE', entityType: 'TEMPERATURE_LOG', entityId: tempId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete temperature log error:', error)
    return NextResponse.json({ error: 'Failed to delete temperature log' }, { status: 500 })
  }
})
