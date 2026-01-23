import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess, canEdit } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'
import { medicationWithRefillSchema } from '@/lib/validation'

// GET /api/workspaces/[id]/medications/[medicationId]
export const GET = withAuth(async (req: AuthenticatedRequest, { params }) => {
  try {
    const { id: workspaceId, medicationId } = await params

    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const medication = await prisma.medication.findFirst({
      where: { id: medicationId, workspaceId },
      include: {
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
        doseLogs: {
          where: { undoneAt: null },
          orderBy: { takenAt: 'desc' },
          take: 10,
          include: {
            loggedBy: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!medication) {
      return NextResponse.json(
        { error: 'Medication not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ medication })
  } catch (error) {
    console.error('Get medication error:', error)
    return NextResponse.json(
      { error: 'Failed to get medication' },
      { status: 500 }
    )
  }
})

// PATCH /api/workspaces/[id]/medications/[medicationId]
export const PATCH = withAuth(async (req: AuthenticatedRequest, { params }) => {
  try {
    const { id: workspaceId, medicationId } = await params

    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access || !canEdit(access.role)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const existing = await prisma.medication.findFirst({
      where: { id: medicationId, workspaceId, deletedAt: null },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Medication not found' },
        { status: 404 }
      )
    }

    const body = await req.json()
    const result = medicationWithRefillSchema.partial().safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {
      ...result.data,
      updatedById: req.session.user.id,
      version: { increment: 1 },
      syncedAt: new Date(),
    }

    if (result.data.startDate !== undefined) {
      updateData.startDate = result.data.startDate ? new Date(result.data.startDate) : null
    }
    if (result.data.endDate !== undefined) {
      updateData.endDate = result.data.endDate ? new Date(result.data.endDate) : null
    }
    if (result.data.lastRefillDate !== undefined) {
      updateData.lastRefillDate = result.data.lastRefillDate ? new Date(result.data.lastRefillDate) : null
    }

    const medication = await prisma.medication.update({
      where: { id: medicationId },
      data: updateData,
      include: {
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        workspaceId,
        userId: req.session.user.id,
        action: 'UPDATE',
        entityType: 'MEDICATION',
        entityId: medicationId,
        details: result.data,
      },
    })

    return NextResponse.json({ medication })
  } catch (error) {
    console.error('Update medication error:', error)
    return NextResponse.json(
      { error: 'Failed to update medication' },
      { status: 500 }
    )
  }
})

// DELETE /api/workspaces/[id]/medications/[medicationId] (soft delete)
export const DELETE = withAuth(async (req: AuthenticatedRequest, { params }) => {
  try {
    const { id: workspaceId, medicationId } = await params

    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access || !canEdit(access.role)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const existing = await prisma.medication.findFirst({
      where: { id: medicationId, workspaceId, deletedAt: null },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Medication not found' },
        { status: 404 }
      )
    }

    await prisma.medication.update({
      where: { id: medicationId },
      data: {
        deletedAt: new Date(),
        active: false,
        updatedById: req.session.user.id,
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
        entityType: 'MEDICATION',
        entityId: medicationId,
        details: { name: existing.name },
      },
    })

    return NextResponse.json({ message: 'Medication deleted' })
  } catch (error) {
    console.error('Delete medication error:', error)
    return NextResponse.json(
      { error: 'Failed to delete medication' },
      { status: 500 }
    )
  }
})
