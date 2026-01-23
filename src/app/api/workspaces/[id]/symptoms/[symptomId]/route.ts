import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess, canEdit } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'
import { symptomSchema } from '@/lib/validation'

// GET /api/workspaces/[id]/symptoms/[symptomId]
export const GET = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId, symptomId } = await params

    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const symptom = await prisma.symptom.findFirst({
      where: { id: symptomId, workspaceId },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    })

    if (!symptom) {
      return NextResponse.json({ error: 'Symptom not found' }, { status: 404 })
    }

    return NextResponse.json({ symptom })
  } catch (error) {
    console.error('Get symptom error:', error)
    return NextResponse.json({ error: 'Failed to get symptom' }, { status: 500 })
  }
})

// DELETE /api/workspaces/[id]/symptoms/[symptomId] (soft delete)
export const DELETE = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId, symptomId } = await params

    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access || !canEdit(access.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const existing = await prisma.symptom.findFirst({
      where: { id: symptomId, workspaceId, deletedAt: null },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Symptom not found' }, { status: 404 })
    }

    await prisma.symptom.update({
      where: { id: symptomId },
      data: {
        deletedAt: new Date(),
        version: { increment: 1 },
        syncedAt: new Date(),
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        workspaceId,
        userId: req.session.user.id,
        action: 'DELETE',
        entityType: 'SYMPTOM',
        entityId: symptomId,
        details: { type: existing.type },
      },
    })

    return NextResponse.json({ message: 'Symptom deleted' })
  } catch (error) {
    console.error('Delete symptom error:', error)
    return NextResponse.json({ error: 'Failed to delete symptom' }, { status: 500 })
  }
})
