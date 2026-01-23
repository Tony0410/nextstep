import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess, canEdit } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'
import { medicationWithRefillSchema } from '@/lib/validation'

// GET /api/workspaces/[id]/medications - List medications
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
    const activeOnly = searchParams.get('activeOnly') !== 'false'
    const includeDeleted = searchParams.get('includeDeleted') === 'true'

    const where: Record<string, unknown> = {
      workspaceId,
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(activeOnly ? { active: true } : {}),
    }

    const medications = await prisma.medication.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ medications })
  } catch (error) {
    console.error('List medications error:', error)
    return NextResponse.json(
      { error: 'Failed to list medications' },
      { status: 500 }
    )
  }
})

// POST /api/workspaces/[id]/medications - Create medication
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
    const result = medicationWithRefillSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const medication = await prisma.medication.create({
      data: {
        workspaceId,
        name: result.data.name,
        instructions: result.data.instructions || null,
        scheduleType: result.data.scheduleType,
        scheduleData: result.data.scheduleData,
        startDate: result.data.startDate ? new Date(result.data.startDate) : null,
        endDate: result.data.endDate ? new Date(result.data.endDate) : null,
        active: result.data.active ?? true,
        // Refill tracking fields
        pillCount: result.data.pillCount ?? null,
        pillsPerDose: result.data.pillsPerDose ?? 1,
        refillThreshold: result.data.refillThreshold ?? 7,
        lastRefillDate: result.data.lastRefillDate ? new Date(result.data.lastRefillDate) : null,
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
        entityType: 'MEDICATION',
        entityId: medication.id,
        details: { name: medication.name },
      },
    })

    return NextResponse.json({ medication }, { status: 201 })
  } catch (error) {
    console.error('Create medication error:', error)
    return NextResponse.json(
      { error: 'Failed to create medication' },
      { status: 500 }
    )
  }
})
