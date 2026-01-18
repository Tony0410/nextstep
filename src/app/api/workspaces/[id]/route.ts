import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'
import { updateWorkspaceSchema } from '@/lib/validation'

// Helper to check workspace access
async function checkWorkspaceAccess(
  workspaceId: string,
  userId: string,
  requiredRoles: string[] = ['OWNER', 'EDITOR', 'VIEWER']
) {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
  })

  if (!member || !requiredRoles.includes(member.role)) {
    return null
  }

  return member
}

// GET /api/workspaces/[id] - Get workspace details
export const GET = withAuth(async (req: AuthenticatedRequest, { params }) => {
  try {
    const { id } = await params

    const member = await checkWorkspaceAccess(id, req.session.user.id)
    if (!member) {
      return NextResponse.json(
        { error: 'Workspace not found or access denied' },
        { status: 404 }
      )
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        clinicPhone: workspace.clinicPhone,
        emergencyPhone: workspace.emergencyPhone,
        quietHoursStart: workspace.quietHoursStart,
        quietHoursEnd: workspace.quietHoursEnd,
        largeTextMode: workspace.largeTextMode,
        role: member.role,
        members: workspace.members.map((m) => ({
          id: m.id,
          role: m.role,
          user: m.user,
        })),
      },
    })
  } catch (error) {
    console.error('Get workspace error:', error)
    return NextResponse.json(
      { error: 'Failed to get workspace' },
      { status: 500 }
    )
  }
})

// PATCH /api/workspaces/[id] - Update workspace settings
export const PATCH = withAuth(async (req: AuthenticatedRequest, { params }) => {
  try {
    const { id } = await params

    const member = await checkWorkspaceAccess(id, req.session.user.id, ['OWNER', 'EDITOR'])
    if (!member) {
      return NextResponse.json(
        { error: 'Workspace not found or access denied' },
        { status: 404 }
      )
    }

    const body = await req.json()
    const result = updateWorkspaceSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const workspace = await prisma.workspace.update({
      where: { id },
      data: result.data,
      select: {
        id: true,
        name: true,
        clinicPhone: true,
        emergencyPhone: true,
        quietHoursStart: true,
        quietHoursEnd: true,
        largeTextMode: true,
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        workspaceId: id,
        userId: req.session.user.id,
        action: 'UPDATE',
        entityType: 'WORKSPACE',
        entityId: id,
        details: result.data,
      },
    })

    return NextResponse.json({ workspace })
  } catch (error) {
    console.error('Update workspace error:', error)
    return NextResponse.json(
      { error: 'Failed to update workspace' },
      { status: 500 }
    )
  }
})
