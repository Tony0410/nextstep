import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'
import { inviteSchema } from '@/lib/validation'
import { nanoid } from 'nanoid'

// Helper to check workspace access
async function checkWorkspaceAccess(
  workspaceId: string,
  userId: string,
  requiredRoles: string[] = ['OWNER']
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

// POST /api/workspaces/[id]/invite - Create invite token
export const POST = withAuth(async (req: AuthenticatedRequest, { params }) => {
  try {
    const { id } = await params

    // Only owners can create invites
    const member = await checkWorkspaceAccess(id, req.session.user.id, ['OWNER'])
    if (!member) {
      return NextResponse.json(
        { error: 'Only workspace owners can create invites' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const result = inviteSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { role, expiresInDays } = result.data

    const token = nanoid(32)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    const invite = await prisma.inviteToken.create({
      data: {
        workspaceId: id,
        token,
        role,
        expiresAt,
      },
    })

    // Build invite URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteUrl = `${baseUrl}/invite/${token}`

    return NextResponse.json({
      invite: {
        token: invite.token,
        role: invite.role,
        expiresAt: invite.expiresAt,
        url: inviteUrl,
      },
    })
  } catch (error) {
    console.error('Create invite error:', error)
    return NextResponse.json(
      { error: 'Failed to create invite' },
      { status: 500 }
    )
  }
})

// GET /api/workspaces/[id]/invite - List active invites
export const GET = withAuth(async (req: AuthenticatedRequest, { params }) => {
  try {
    const { id } = await params

    const member = await checkWorkspaceAccess(id, req.session.user.id, ['OWNER'])
    if (!member) {
      return NextResponse.json(
        { error: 'Only workspace owners can view invites' },
        { status: 403 }
      )
    }

    const invites = await prisma.inviteToken.findMany({
      where: {
        workspaceId: id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    return NextResponse.json({
      invites: invites.map((i) => ({
        id: i.id,
        token: i.token,
        role: i.role,
        expiresAt: i.expiresAt,
        url: `${baseUrl}/invite/${i.token}`,
      })),
    })
  } catch (error) {
    console.error('List invites error:', error)
    return NextResponse.json(
      { error: 'Failed to list invites' },
      { status: 500 }
    )
  }
})
