import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess, canEdit } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'
import { weightLogSchema } from '@/lib/validation'

export const GET = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId } = await params
    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

    const where: Record<string, unknown> = { workspaceId, deletedAt: null }
    if (from || to) {
      where.recordedAt = {}
      if (from) (where.recordedAt as Record<string, unknown>).gte = new Date(from)
      if (to) (where.recordedAt as Record<string, unknown>).lte = new Date(to)
    }

    const weightLogs = await prisma.weightLog.findMany({
      where, orderBy: { recordedAt: 'desc' }, take: limit,
      include: { createdBy: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ weightLogs })
  } catch (error) {
    console.error('List weight logs error:', error)
    return NextResponse.json({ error: 'Failed to list weight logs' }, { status: 500 })
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
    const result = weightLogSchema.safeParse(body)
    if (!result.success) return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 })

    const weightLog = await prisma.weightLog.create({
      data: {
        workspaceId,
        weightKg: result.data.weightKg,
        notes: result.data.notes || null,
        recordedAt: result.data.recordedAt ? new Date(result.data.recordedAt) : new Date(),
        createdById: req.session.user.id,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    })

    await prisma.auditLog.create({
      data: {
        workspaceId, userId: req.session.user.id,
        action: 'CREATE', entityType: 'WEIGHT_LOG', entityId: weightLog.id,
        details: { weightKg: weightLog.weightKg },
      },
    })

    return NextResponse.json({ weightLog }, { status: 201 })
  } catch (error) {
    console.error('Create weight log error:', error)
    return NextResponse.json({ error: 'Failed to create weight log' }, { status: 500 })
  }
})
