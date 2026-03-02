import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess, canEdit } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'
import { caregiverTaskSchema } from '@/lib/validation'

const PRIORITY_ORDER: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
}

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
    const assignedTo = searchParams.get('assignedTo')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

    const where: Record<string, unknown> = { workspaceId, deletedAt: null }
    if (status) where.status = status
    if (assignedTo) where.assignedToId = assignedTo

    const tasks = await prisma.caregiverTask.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    // Sort by priority order (URGENT first), then by createdAt desc
    tasks.sort((a: { priority: string; createdAt: Date }, b: { priority: string; createdAt: Date }) => {
      const priorityDiff = (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99)
      if (priorityDiff !== 0) return priorityDiff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('List caregiver tasks error:', error)
    return NextResponse.json({ error: 'Failed to list tasks' }, { status: 500 })
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
    const result = caregiverTaskSchema.safeParse(body)
    if (!result.success) return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 })

    const task = await prisma.caregiverTask.create({
      data: {
        workspaceId,
        title: result.data.title,
        description: result.data.description || null,
        category: result.data.category,
        priority: result.data.priority || 'NORMAL',
        status: result.data.status || 'TODO',
        assignedToId: result.data.assignedToId || null,
        dueDate: result.data.dueDate ? new Date(result.data.dueDate) : null,
        createdById: req.session.user.id,
        updatedById: req.session.user.id,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    await prisma.auditLog.create({
      data: {
        workspaceId, userId: req.session.user.id,
        action: 'CREATE', entityType: 'CAREGIVER_TASK', entityId: task.id,
        details: { title: task.title, category: task.category, priority: task.priority },
      },
    })

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error('Create caregiver task error:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
})
