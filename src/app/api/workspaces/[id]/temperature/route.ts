import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess, canEdit } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'
import { temperatureLogSchema } from '@/lib/validation'

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

    const temperatureLogs = await prisma.temperatureLog.findMany({
      where, orderBy: { recordedAt: 'desc' }, take: limit,
      include: { createdBy: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ temperatureLogs })
  } catch (error) {
    console.error('List temperature logs error:', error)
    return NextResponse.json({ error: 'Failed to list temperature logs' }, { status: 500 })
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
    const result = temperatureLogSchema.safeParse(body)
    if (!result.success) return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 })

    const temperatureLog = await prisma.temperatureLog.create({
      data: {
        workspaceId,
        tempCelsius: result.data.tempCelsius,
        method: result.data.method || null,
        notes: result.data.notes || null,
        recordedAt: result.data.recordedAt ? new Date(result.data.recordedAt) : new Date(),
        createdById: req.session.user.id,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    })

    await prisma.auditLog.create({
      data: {
        workspaceId, userId: req.session.user.id,
        action: 'CREATE', entityType: 'TEMPERATURE_LOG', entityId: temperatureLog.id,
        details: { tempCelsius: temperatureLog.tempCelsius, method: temperatureLog.method },
      },
    })

    return NextResponse.json({ temperatureLog }, { status: 201 })
  } catch (error) {
    console.error('Create temperature log error:', error)
    return NextResponse.json({ error: 'Failed to create temperature log' }, { status: 500 })
  }
})
