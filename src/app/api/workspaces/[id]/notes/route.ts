import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess, canEdit } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'
import { noteSchema } from '@/lib/validation'

// GET /api/workspaces/[id]/notes - List notes
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
    const type = searchParams.get('type') as 'QUESTION' | 'GENERAL' | null
    const includeDeleted = searchParams.get('includeDeleted') === 'true'

    const where: Record<string, unknown> = {
      workspaceId,
      ...(type ? { type } : {}),
      ...(includeDeleted ? {} : { deletedAt: null }),
    }

    const notes = await prisma.note.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ notes })
  } catch (error) {
    console.error('List notes error:', error)
    return NextResponse.json(
      { error: 'Failed to list notes' },
      { status: 500 }
    )
  }
})

// POST /api/workspaces/[id]/notes - Create note
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
    const result = noteSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const note = await prisma.note.create({
      data: {
        workspaceId,
        type: result.data.type,
        content: result.data.content,
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
        entityType: 'NOTE',
        entityId: note.id,
        details: { type: note.type },
      },
    })

    return NextResponse.json({ note }, { status: 201 })
  } catch (error) {
    console.error('Create note error:', error)
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    )
  }
})
