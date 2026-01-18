import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'
import { createWorkspaceSchema } from '@/lib/validation'

// GET /api/workspaces - List user's workspaces
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: req.session.user.id },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            clinicPhone: true,
            emergencyPhone: true,
            quietHoursStart: true,
            quietHoursEnd: true,
            largeTextMode: true,
            createdAt: true,
          },
        },
      },
    })

    return NextResponse.json({
      workspaces: memberships.map((m) => ({
        ...m.workspace,
        role: m.role,
      })),
    })
  } catch (error) {
    console.error('List workspaces error:', error)
    return NextResponse.json(
      { error: 'Failed to list workspaces' },
      { status: 500 }
    )
  }
})

// POST /api/workspaces - Create a new workspace
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json()
    const result = createWorkspaceSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { name } = result.data

    const workspace = await prisma.workspace.create({
      data: {
        name,
        members: {
          create: {
            userId: req.session.user.id,
            role: 'OWNER',
          },
        },
      },
      select: {
        id: true,
        name: true,
        clinicPhone: true,
        emergencyPhone: true,
        quietHoursStart: true,
        quietHoursEnd: true,
        largeTextMode: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      workspace: {
        ...workspace,
        role: 'OWNER',
      },
    })
  } catch (error) {
    console.error('Create workspace error:', error)
    return NextResponse.json(
      { error: 'Failed to create workspace' },
      { status: 500 }
    )
  }
})
