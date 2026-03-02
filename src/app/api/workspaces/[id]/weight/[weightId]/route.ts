import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess, canEdit } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'

export const DELETE = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId, weightId } = await params
    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access || !canEdit(access.role)) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const existing = await prisma.weightLog.findFirst({ where: { id: weightId, workspaceId, deletedAt: null } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.weightLog.update({ where: { id: weightId }, data: { deletedAt: new Date() } })

    await prisma.auditLog.create({
      data: {
        workspaceId, userId: req.session.user.id,
        action: 'DELETE', entityType: 'WEIGHT_LOG', entityId: weightId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete weight log error:', error)
    return NextResponse.json({ error: 'Failed to delete weight log' }, { status: 500 })
  }
})
