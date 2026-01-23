import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess, canEdit } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'
import { symptomSchema } from '@/lib/validation'

// GET /api/workspaces/[id]/symptoms
export const GET = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId } = await params

    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const includeDeleted = searchParams.get('includeDeleted') === 'true'
    const type = searchParams.get('type')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

    const where: Record<string, unknown> = {
      workspaceId,
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(type ? { type } : {}),
    }

    if (from || to) {
      where.recordedAt = {}
      if (from) (where.recordedAt as Record<string, unknown>).gte = new Date(from)
      if (to) (where.recordedAt as Record<string, unknown>).lte = new Date(to)
    }

    const symptoms = await prisma.symptom.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
      take: limit,
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ symptoms })
  } catch (error) {
    console.error('List symptoms error:', error)
    return NextResponse.json({ error: 'Failed to list symptoms' }, { status: 500 })
  }
})

// POST /api/workspaces/[id]/symptoms
export const POST = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId } = await params

    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access || !canEdit(access.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await req.json()
    const result = symptomSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const symptom = await prisma.symptom.create({
      data: {
        workspaceId,
        type: result.data.type,
        customName: result.data.customName || null,
        severity: result.data.severity,
        notes: result.data.notes || null,
        recordedAt: result.data.recordedAt ? new Date(result.data.recordedAt) : new Date(),
        createdById: req.session.user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        workspaceId,
        userId: req.session.user.id,
        action: 'CREATE',
        entityType: 'SYMPTOM',
        entityId: symptom.id,
        details: { type: symptom.type, severity: symptom.severity },
      },
    })

    return NextResponse.json({ symptom }, { status: 201 })
  } catch (error) {
    console.error('Create symptom error:', error)
    return NextResponse.json({ error: 'Failed to create symptom' }, { status: 500 })
  }
})
