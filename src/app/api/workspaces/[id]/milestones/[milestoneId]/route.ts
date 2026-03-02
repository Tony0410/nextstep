import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess, canEdit } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'
import { milestoneSchema } from '@/lib/validation'

export const PATCH = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId, milestoneId } = await params
    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access || !canEdit(access.role)) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const existing = await prisma.treatmentMilestone.findFirst({ where: { id: milestoneId, workspaceId, deletedAt: null } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const result = milestoneSchema.partial().safeParse(body)
    if (!result.success) return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 })

    const updateData: Record<string, unknown> = {
      ...result.data,
      updatedById: req.session.user.id,
    }

    // Convert date strings to Date objects
    if (result.data.plannedDate) {
      updateData.plannedDate = new Date(result.data.plannedDate)
    }
    if (result.data.actualDate !== undefined) {
      updateData.actualDate = result.data.actualDate ? new Date(result.data.actualDate) : null
    }

    // Auto-set actualDate when completing
    if (result.data.status === 'COMPLETED' && !existing.actualDate && !result.data.actualDate) {
      updateData.actualDate = new Date()
    }

    const milestone = await prisma.treatmentMilestone.update({
      where: { id: milestoneId },
      data: updateData,
      include: {
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
      },
    })

    await prisma.auditLog.create({
      data: {
        workspaceId, userId: req.session.user.id,
        action: 'UPDATE', entityType: 'MILESTONE', entityId: milestoneId,
        details: result.data,
      },
    })

    return NextResponse.json({ milestone })
  } catch (error) {
    console.error('Update milestone error:', error)
    return NextResponse.json({ error: 'Failed to update milestone' }, { status: 500 })
  }
})

export const DELETE = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId, milestoneId } = await params
    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access || !canEdit(access.role)) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const existing = await prisma.treatmentMilestone.findFirst({ where: { id: milestoneId, workspaceId, deletedAt: null } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.treatmentMilestone.update({ where: { id: milestoneId }, data: { deletedAt: new Date() } })

    await prisma.auditLog.create({
      data: {
        workspaceId, userId: req.session.user.id,
        action: 'DELETE', entityType: 'MILESTONE', entityId: milestoneId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete milestone error:', error)
    return NextResponse.json({ error: 'Failed to delete milestone' }, { status: 500 })
  }
})
