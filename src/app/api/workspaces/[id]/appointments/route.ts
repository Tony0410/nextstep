import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess, canEdit } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'
import { appointmentSchema } from '@/lib/validation'

// GET /api/workspaces/[id]/appointments - List appointments
export const GET = withAuth(async (req: AuthenticatedRequest, { params }) => {
  try {
    const { id: workspaceId } = await params

    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access) {
      return NextResponse.json(
        { error: 'Workspace not found or access denied' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(req.url)
    const includeDeleted = searchParams.get('includeDeleted') === 'true'
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')

    const where: Record<string, unknown> = {
      workspaceId,
      ...(includeDeleted ? {} : { deletedAt: null }),
    }

    if (fromDate) {
      where.datetime = { ...(where.datetime as object || {}), gte: new Date(fromDate) }
    }
    if (toDate) {
      where.datetime = { ...(where.datetime as object || {}), lte: new Date(toDate) }
    }

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { datetime: 'asc' },
      include: {
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ appointments })
  } catch (error) {
    console.error('List appointments error:', error)
    return NextResponse.json(
      { error: 'Failed to list appointments' },
      { status: 500 }
    )
  }
})

// POST /api/workspaces/[id]/appointments - Create appointment
export const POST = withAuth(async (req: AuthenticatedRequest, { params }) => {
  try {
    const { id: workspaceId } = await params

    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access || !canEdit(access.role)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const result = appointmentSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const appointment = await prisma.appointment.create({
      data: {
        workspaceId,
        title: result.data.title,
        datetime: new Date(result.data.datetime),
        location: result.data.location || null,
        mapUrl: result.data.mapUrl || null,
        notes: result.data.notes || null,
        createdById: req.session.user.id,
        updatedById: req.session.user.id,
      },
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
        action: 'CREATE',
        entityType: 'APPOINTMENT',
        entityId: appointment.id,
        details: { title: appointment.title },
      },
    })

    return NextResponse.json({ appointment }, { status: 201 })
  } catch (error) {
    console.error('Create appointment error:', error)
    return NextResponse.json(
      { error: 'Failed to create appointment' },
      { status: 500 }
    )
  }
})
