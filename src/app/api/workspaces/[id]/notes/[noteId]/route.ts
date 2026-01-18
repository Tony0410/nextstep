import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess, canEdit } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'
import { noteSchema } from '@/lib/validation'

// GET /api/workspaces/[id]/notes/[noteId]
export const GET = withAuth(async (req: AuthenticatedRequest, { params }) => {
  try {
    const { id: workspaceId, noteId } = await params

    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const note = await prisma.note.findFirst({
      where: { id: noteId, workspaceId },
      include: {
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
      },
    })

    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ note })
  } catch (error) {
    console.error('Get note error:', error)
    return NextResponse.json(
      { error: 'Failed to get note' },
      { status: 500 }
    )
  }
})

// PATCH /api/workspaces/[id]/notes/[noteId]
export const PATCH = withAuth(async (req: AuthenticatedRequest, { params }) => {
  try {
    const { id: workspaceId, noteId } = await params

    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access || !canEdit(access.role)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const existing = await prisma.note.findFirst({
      where: { id: noteId, workspaceId, deletedAt: null },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }

    const body = await req.json()

    // Handle marking question as asked
    if (body.markAsked === true && existing.type === 'QUESTION') {
      const note = await prisma.note.update({
        where: { id: noteId },
        data: {
          askedAt: new Date(),
          updatedById: req.session.user.id,
          version: { increment: 1 },
          syncedAt: new Date(),
        },
        include: {
          createdBy: { select: { id: true, name: true } },
          updatedBy: { select: { id: true, name: true } },
        },
      })

      await prisma.auditLog.create({
        data: {
          workspaceId,
          userId: req.session.user.id,
          action: 'MARK_ASKED',
          entityType: 'NOTE',
          entityId: noteId,
        },
      })

      return NextResponse.json({ note })
    }

    const result = noteSchema.partial().safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const note = await prisma.note.update({
      where: { id: noteId },
      data: {
        ...result.data,
        updatedById: req.session.user.id,
        version: { increment: 1 },
        syncedAt: new Date(),
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
      },
    })

    await prisma.auditLog.create({
      data: {
        workspaceId,
        userId: req.session.user.id,
        action: 'UPDATE',
        entityType: 'NOTE',
        entityId: noteId,
        details: result.data,
      },
    })

    return NextResponse.json({ note })
  } catch (error) {
    console.error('Update note error:', error)
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    )
  }
})

// DELETE /api/workspaces/[id]/notes/[noteId] (soft delete)
export const DELETE = withAuth(async (req: AuthenticatedRequest, { params }) => {
  try {
    const { id: workspaceId, noteId } = await params

    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access || !canEdit(access.role)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const existing = await prisma.note.findFirst({
      where: { id: noteId, workspaceId, deletedAt: null },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }

    await prisma.note.update({
      where: { id: noteId },
      data: {
        deletedAt: new Date(),
        updatedById: req.session.user.id,
        version: { increment: 1 },
        syncedAt: new Date(),
      },
    })

    await prisma.auditLog.create({
      data: {
        workspaceId,
        userId: req.session.user.id,
        action: 'DELETE',
        entityType: 'NOTE',
        entityId: noteId,
      },
    })

    return NextResponse.json({ message: 'Note deleted' })
  } catch (error) {
    console.error('Delete note error:', error)
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    )
  }
})
