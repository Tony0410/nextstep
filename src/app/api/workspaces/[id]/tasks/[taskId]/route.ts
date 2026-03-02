import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess, canEdit } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'
import { caregiverTaskSchema } from '@/lib/validation'

export const PATCH = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId, taskId } = await params
    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access || !canEdit(access.role)) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const existing = await prisma.caregiverTask.findFirst({ where: { id: taskId, workspaceId, deletedAt: null } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const result = caregiverTaskSchema.partial().safeParse(body)
    if (!result.success) return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 })

    // Build update data
    const updateData: Record<string, unknown> = {
      ...result.data,
      updatedById: req.session.user.id,
    }

    // Convert dueDate string to Date if provided
    if (result.data.dueDate !== undefined) {
      updateData.dueDate = result.data.dueDate ? new Date(result.data.dueDate) : null
    }

    // Handle completedAt based on status changes
    if (result.data.status === 'DONE' && existing.status !== 'DONE' && !existing.completedAt) {
      updateData.completedAt = new Date()
      updateData.completedById = req.session.user.id
    } else if (result.data.status && result.data.status !== 'DONE' && existing.status === 'DONE') {
      updateData.completedAt = null
      updateData.completedById = null
    }

    const task = await prisma.caregiverTask.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    await prisma.auditLog.create({
      data: {
        workspaceId, userId: req.session.user.id,
        action: 'UPDATE', entityType: 'CAREGIVER_TASK', entityId: taskId,
        details: result.data,
      },
    })

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Update caregiver task error:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
})

export const DELETE = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId, taskId } = await params
    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access || !canEdit(access.role)) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const existing = await prisma.caregiverTask.findFirst({ where: { id: taskId, workspaceId, deletedAt: null } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.caregiverTask.update({ where: { id: taskId }, data: { deletedAt: new Date() } })

    await prisma.auditLog.create({
      data: {
        workspaceId, userId: req.session.user.id,
        action: 'DELETE', entityType: 'CAREGIVER_TASK', entityId: taskId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete caregiver task error:', error)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
})
