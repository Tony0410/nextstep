import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'

// GET /api/workspaces/[id]/activity
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
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const entityType = searchParams.get('entityType')
    const action = searchParams.get('action')

    const where: Record<string, unknown> = {
      workspaceId,
      ...(entityType ? { entityType } : {}),
      ...(action ? { action } : {}),
    }

    const [activities, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ])

    return NextResponse.json({
      activities,
      total,
      hasMore: offset + activities.length < total,
    })
  } catch (error) {
    console.error('Get activity error:', error)
    return NextResponse.json({ error: 'Failed to get activity' }, { status: 500 })
  }
})
