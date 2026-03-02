import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess, canEdit } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'
import { labResultSchema } from '@/lib/validation'

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
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

    const where: Record<string, unknown> = { workspaceId, deletedAt: null }
    if (from || to) {
      const dateFilter: Record<string, Date> = {}
      if (from) dateFilter.gte = new Date(from)
      if (to) dateFilter.lte = new Date(to)
      where.testDate = dateFilter
    }

    const labResults = await prisma.labResult.findMany({
      where,
      orderBy: { testDate: 'desc' },
      take: limit,
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ labResults })
  } catch (error) {
    console.error('List lab results error:', error)
    return NextResponse.json({ error: 'Failed to list lab results' }, { status: 500 })
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
    const result = labResultSchema.safeParse(body)
    if (!result.success) return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 })

    const labResult = await prisma.labResult.create({
      data: {
        workspaceId,
        testDate: new Date(result.data.testDate),
        panelName: result.data.panelName,
        labName: result.data.labName || null,
        results: result.data.results as any,
        notes: result.data.notes || null,
        createdById: req.session.user.id,
        updatedById: req.session.user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    })

    await prisma.auditLog.create({
      data: {
        workspaceId, userId: req.session.user.id,
        action: 'CREATE', entityType: 'LAB_RESULT', entityId: labResult.id,
        details: { panelName: labResult.panelName, markerCount: result.data.results.length },
      },
    })

    return NextResponse.json({ labResult }, { status: 201 })
  } catch (error) {
    console.error('Create lab result error:', error)
    return NextResponse.json({ error: 'Failed to create lab result' }, { status: 500 })
  }
})
