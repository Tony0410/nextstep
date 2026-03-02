import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess, canEdit } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'
import { milestoneSchema } from '@/lib/validation'

export const GET = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId } = await params
    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

    const where: Record<string, unknown> = { workspaceId, deletedAt: null }
    if (status) {
      where.status = status
    }

    const milestones = await prisma.treatmentMilestone.findMany({
      where, orderBy: { plannedDate: 'asc' }, take: limit,
      include: { createdBy: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ milestones })
  } catch (error) {
    console.error('List milestones error:', error)
    return NextResponse.json({ error: 'Failed to list milestones' }, { status: 500 })
  }
})

export const POST = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId } = await params
    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access || !canEdit(access.role)) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const body = await req.json()
    const result = milestoneSchema.safeParse(body)
    if (!result.success) return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 })

    const existingCount = await prisma.treatmentMilestone.count({
      where: { workspaceId, deletedAt: null },
    })

    const milestone = await prisma.treatmentMilestone.create({
      data: {
        workspaceId,
        type: result.data.type,
        title: result.data.title,
        description: result.data.description || null,
        plannedDate: new Date(result.data.plannedDate),
        actualDate: result.data.actualDate ? new Date(result.data.actualDate) : null,
        status: result.data.status || 'SCHEDULED',
        notes: result.data.notes || null,
        sortOrder: existingCount,
        createdById: req.session.user.id,
        updatedById: req.session.user.id,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    })

    await prisma.auditLog.create({
      data: {
        workspaceId, userId: req.session.user.id,
        action: 'CREATE', entityType: 'MILESTONE', entityId: milestone.id,
        details: { type: milestone.type, title: milestone.title },
      },
    })

    return NextResponse.json({ milestone }, { status: 201 })
  } catch (error) {
    console.error('Create milestone error:', error)
    return NextResponse.json({ error: 'Failed to create milestone' }, { status: 500 })
  }
})
