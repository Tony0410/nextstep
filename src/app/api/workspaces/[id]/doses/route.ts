import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess, canEdit } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'
import { doseLogSchema, undoDoseSchema } from '@/lib/validation'

// GET /api/workspaces/[id]/doses - List dose logs
export const GET = withAuth(async (req: AuthenticatedRequest, { params }) => {
  try {
    const { id: workspaceId } = await params

    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const medicationId = searchParams.get('medicationId')
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')
    const includeUndone = searchParams.get('includeUndone') === 'true'
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

    const where: Record<string, unknown> = {
      workspaceId,
      ...(medicationId ? { medicationId } : {}),
      ...(includeUndone ? {} : { undoneAt: null }),
    }

    if (fromDate || toDate) {
      where.takenAt = {}
      if (fromDate) (where.takenAt as Record<string, unknown>).gte = new Date(fromDate)
      if (toDate) (where.takenAt as Record<string, unknown>).lte = new Date(toDate)
    }

    const doseLogs = await prisma.doseLog.findMany({
      where,
      orderBy: { takenAt: 'desc' },
      take: limit,
      include: {
        medication: {
          select: { id: true, name: true },
        },
        loggedBy: { select: { id: true, name: true } },
        undoneBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ doseLogs })
  } catch (error) {
    console.error('List dose logs error:', error)
    return NextResponse.json(
      { error: 'Failed to list dose logs' },
      { status: 500 }
    )
  }
})

// POST /api/workspaces/[id]/doses - Log a dose (Take medication)
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
    const result = doseLogSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      )
    }

    // Verify medication exists and belongs to workspace
    const medication = await prisma.medication.findFirst({
      where: {
        id: result.data.medicationId,
        workspaceId,
        deletedAt: null,
      },
    })

    if (!medication) {
      return NextResponse.json(
        { error: 'Medication not found' },
        { status: 404 }
      )
    }

    const takenAt = result.data.takenAt ? new Date(result.data.takenAt) : new Date()

    const doseLog = await prisma.doseLog.create({
      data: {
        medicationId: result.data.medicationId,
        workspaceId,
        takenAt,
        loggedById: req.session.user.id,
      },
      include: {
        medication: { select: { id: true, name: true } },
        loggedBy: { select: { id: true, name: true } },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        workspaceId,
        userId: req.session.user.id,
        action: 'TAKE_DOSE',
        entityType: 'DOSE_LOG',
        entityId: doseLog.id,
        details: { medicationName: medication.name, takenAt: takenAt.toISOString() },
      },
    })

    return NextResponse.json({ doseLog }, { status: 201 })
  } catch (error) {
    console.error('Log dose error:', error)
    return NextResponse.json(
      { error: 'Failed to log dose' },
      { status: 500 }
    )
  }
})

// PATCH /api/workspaces/[id]/doses - Undo a dose
export const PATCH = withAuth(async (req: AuthenticatedRequest, { params }) => {
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
    const result = undoDoseSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const doseLog = await prisma.doseLog.findFirst({
      where: {
        id: result.data.doseLogId,
        workspaceId,
        undoneAt: null,
      },
      include: {
        medication: { select: { name: true } },
      },
    })

    if (!doseLog) {
      return NextResponse.json(
        { error: 'Dose log not found or already undone' },
        { status: 404 }
      )
    }

    // Check if within undo window (5 minutes)
    const minutesSinceDose = (Date.now() - doseLog.takenAt.getTime()) / 1000 / 60
    if (minutesSinceDose > 5) {
      return NextResponse.json(
        { error: 'Undo window has expired (5 minutes)' },
        { status: 400 }
      )
    }

    const updated = await prisma.doseLog.update({
      where: { id: doseLog.id },
      data: {
        undoneAt: new Date(),
        undoneById: req.session.user.id,
      },
      include: {
        medication: { select: { id: true, name: true } },
        loggedBy: { select: { id: true, name: true } },
        undoneBy: { select: { id: true, name: true } },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        workspaceId,
        userId: req.session.user.id,
        action: 'UNDO_DOSE',
        entityType: 'DOSE_LOG',
        entityId: doseLog.id,
        details: { medicationName: doseLog.medication.name },
      },
    })

    return NextResponse.json({ doseLog: updated })
  } catch (error) {
    console.error('Undo dose error:', error)
    return NextResponse.json(
      { error: 'Failed to undo dose' },
      { status: 500 }
    )
  }
})
