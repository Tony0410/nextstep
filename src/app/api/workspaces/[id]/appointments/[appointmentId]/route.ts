import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess, canEdit } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'
import { appointmentSchema } from '@/lib/validation'

// GET /api/workspaces/[id]/appointments/[appointmentId]
export const GET = withAuth(async (req: AuthenticatedRequest, { params }) => {
  try {
    const { id: workspaceId, appointmentId } = await params

    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, workspaceId },
      include: {
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
      },
    })

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ appointment })
  } catch (error) {
    console.error('Get appointment error:', error)
    return NextResponse.json(
      { error: 'Failed to get appointment' },
      { status: 500 }
    )
  }
})

// PATCH /api/workspaces/[id]/appointments/[appointmentId]
export const PATCH = withAuth(async (req: AuthenticatedRequest, { params }) => {
  try {
    const { id: workspaceId, appointmentId } = await params

    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access || !canEdit(access.role)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const existing = await prisma.appointment.findFirst({
      where: { id: appointmentId, workspaceId, deletedAt: null },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    const body = await req.json()
    const result = appointmentSchema.partial().safeParse(body)

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

    if (result.data.datetime) {
      updateData.datetime = new Date(result.data.datetime)
    }

    const appointment = await prisma.appointment.update({
      where: { id: appointmentId },
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
        entityType: 'APPOINTMENT',
        entityId: appointmentId,
        details: result.data,
      },
    })

    return NextResponse.json({ appointment })
  } catch (error) {
    console.error('Update appointment error:', error)
    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    )
  }
})

// DELETE /api/workspaces/[id]/appointments/[appointmentId] (soft delete)
export const DELETE = withAuth(async (req: AuthenticatedRequest, { params }) => {
  try {
    const { id: workspaceId, appointmentId } = await params

    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access || !canEdit(access.role)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const existing = await prisma.appointment.findFirst({
      where: { id: appointmentId, workspaceId, deletedAt: null },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        deletedAt: new Date(),
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
        entityType: 'APPOINTMENT',
        entityId: appointmentId,
        details: { title: existing.title },
      },
    })

    return NextResponse.json({ message: 'Appointment deleted' })
  } catch (error) {
    console.error('Delete appointment error:', error)
    return NextResponse.json(
      { error: 'Failed to delete appointment' },
      { status: 500 }
    )
  }
})
