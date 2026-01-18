import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSession } from '@/lib/auth'
import { withRateLimit } from '@/lib/auth/middleware'

// GET /api/invite/[token] - Get invite details (public)
async function getHandler(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const invite = await prisma.inviteToken.findUnique({
      where: { token },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!invite) {
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      )
    }

    if (invite.usedAt) {
      return NextResponse.json(
        { error: 'This invite has already been used' },
        { status: 410 }
      )
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This invite has expired' },
        { status: 410 }
      )
    }

    return NextResponse.json({
      invite: {
        workspaceName: invite.workspace.name,
        role: invite.role,
        expiresAt: invite.expiresAt,
      },
    })
  } catch (error) {
    console.error('Get invite error:', error)
    return NextResponse.json(
      { error: 'Failed to get invite' },
      { status: 500 }
    )
  }
}

// POST /api/invite/[token] - Accept invite (requires auth)
async function postHandler(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json(
        { error: 'You must be logged in to accept an invite' },
        { status: 401 }
      )
    }

    const { token } = await params

    const invite = await prisma.inviteToken.findUnique({
      where: { token },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!invite) {
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      )
    }

    if (invite.usedAt) {
      return NextResponse.json(
        { error: 'This invite has already been used' },
        { status: 410 }
      )
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This invite has expired' },
        { status: 410 }
      )
    }

    // Check if already a member
    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: invite.workspaceId,
          userId: session.user.id,
        },
      },
    })

    if (existingMember) {
      return NextResponse.json(
        { error: 'You are already a member of this workspace' },
        { status: 409 }
      )
    }

    // Accept invite in a transaction
    const [member] = await prisma.$transaction([
      prisma.workspaceMember.create({
        data: {
          workspaceId: invite.workspaceId,
          userId: session.user.id,
          role: invite.role,
        },
      }),
      prisma.inviteToken.update({
        where: { id: invite.id },
        data: {
          usedAt: new Date(),
          usedById: session.user.id,
        },
      }),
      prisma.auditLog.create({
        data: {
          workspaceId: invite.workspaceId,
          userId: session.user.id,
          action: 'JOIN',
          entityType: 'WORKSPACE',
          entityId: invite.workspaceId,
          details: { role: invite.role, inviteToken: token },
        },
      }),
    ])

    return NextResponse.json({
      workspace: {
        id: invite.workspace.id,
        name: invite.workspace.name,
        role: member.role,
      },
    })
  } catch (error) {
    console.error('Accept invite error:', error)
    return NextResponse.json(
      { error: 'Failed to accept invite' },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(getHandler)
export const POST = withRateLimit(postHandler)
