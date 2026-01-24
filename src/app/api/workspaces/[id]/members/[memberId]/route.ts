import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'
import { checkWorkspaceAccess } from '@/lib/db/workspace-access'
import { z } from 'zod'

// GET /api/workspaces/[id]/members/[memberId] - Get member details
export const GET = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId, memberId } = await params

    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const member = await prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            lastLoginAt: true,
            forcePasswordReset: true,
            createdAt: true,
          },
        },
      },
    })

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    return NextResponse.json({ member })
  } catch (error) {
    console.error('Get member error:', error)
    return NextResponse.json({ error: 'Failed to get member' }, { status: 500 })
  }
})

const updateMemberSchema = z.object({
  role: z.enum(['OWNER', 'EDITOR', 'VIEWER']).optional(),
})

// PATCH /api/workspaces/[id]/members/[memberId] - Update member role
export const PATCH = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId, memberId } = await params

    // Check access (must be owner)
    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access || access.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only owners can update members' }, { status: 403 })
    }

    const body = await req.json()
    const result = updateMemberSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { role } = result.data

    // Get the member
    const member = await prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    })

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Prevent changing own role
    if (member.userId === req.session.user.id) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
    }

    // Update member
    const updatedMember = await prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            lastLoginAt: true,
            forcePasswordReset: true,
            createdAt: true,
          },
        },
      },
    })

    return NextResponse.json({
      member: {
        id: updatedMember.id,
        role: updatedMember.role,
        joinedAt: updatedMember.createdAt,
        user: updatedMember.user,
      },
    })
  } catch (error) {
    console.error('Update member error:', error)
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
  }
})

// DELETE /api/workspaces/[id]/members/[memberId] - Remove member from workspace
export const DELETE = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId, memberId } = await params

    // Check access (must be owner)
    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access || access.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only owners can remove members' }, { status: 403 })
    }

    // Get the member
    const member = await prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    })

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Prevent removing self
    if (member.userId === req.session.user.id) {
      return NextResponse.json({ error: 'Cannot remove yourself from workspace' }, { status: 400 })
    }

    // Delete member
    await prisma.workspaceMember.delete({
      where: { id: memberId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove member error:', error)
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
  }
})
