import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess, canEdit } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'

export const POST = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId, taskId } = await params
    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access || !canEdit(access.role)) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const existing = await prisma.caregiverTask.findFirst({ where: { id: taskId, workspaceId, deletedAt: null } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const task = await prisma.caregiverTask.update({
      where: { id: taskId },
      data: {
        status: 'DONE',
        completedAt: new Date(),
        completedById: req.session.user.id,
        updatedById: req.session.user.id,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    await prisma.auditLog.create({
      data: {
        workspaceId, userId: req.session.user.id,
        action: 'UPDATE', entityType: 'CAREGIVER_TASK', entityId: taskId,
        details: { status: 'DONE' },
      },
    })

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Complete caregiver task error:', error)
    return NextResponse.json({ error: 'Failed to complete task' }, { status: 500 })
  }
})
