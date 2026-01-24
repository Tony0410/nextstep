import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { withAuth, type AuthenticatedRequest, hashPassword } from '@/lib/auth'
import { checkWorkspaceAccess } from '@/lib/db/workspace-access'
import { z } from 'zod'

// GET /api/workspaces/[id]/members - List all members
export const GET = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId } = await params

    // Check access (must be at least a member)
    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
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
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        role: m.role,
        joinedAt: m.createdAt,
        user: m.user,
      })),
    })
  } catch (error) {
    console.error('List members error:', error)
    return NextResponse.json({ error: 'Failed to list members' }, { status: 500 })
  }
})

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['OWNER', 'EDITOR', 'VIEWER']).default('VIEWER'),
  forcePasswordReset: z.boolean().default(true),
})

// POST /api/workspaces/[id]/members - Create a new user and add to workspace
export const POST = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId } = await params

    // Check access (must be owner)
    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access || access.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only owners can create users' }, { status: 403 })
    }

    const body = await req.json()
    const result = createUserSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { name, email, password, role, forcePasswordReset } = result.data

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      // Check if already a member
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: existingUser.id,
          },
        },
      })

      if (existingMember) {
        return NextResponse.json(
          { error: 'User is already a member of this workspace' },
          { status: 400 }
        )
      }

      // Add existing user to workspace
      const member = await prisma.workspaceMember.create({
        data: {
          workspaceId,
          userId: existingUser.id,
          role,
        },
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
          id: member.id,
          role: member.role,
          joinedAt: member.createdAt,
          user: member.user,
        },
        message: 'Existing user added to workspace',
      })
    }

    // Create new user and add to workspace
    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        forcePasswordReset,
        workspaceMembers: {
          create: {
            workspaceId,
            role,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        lastLoginAt: true,
        forcePasswordReset: true,
        createdAt: true,
        workspaceMembers: {
          where: { workspaceId },
          select: {
            id: true,
            role: true,
            createdAt: true,
          },
        },
      },
    })

    const member = user.workspaceMembers[0]

    return NextResponse.json({
      member: {
        id: member.id,
        role: member.role,
        joinedAt: member.createdAt,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          lastLoginAt: user.lastLoginAt,
          forcePasswordReset: user.forcePasswordReset,
          createdAt: user.createdAt,
        },
      },
      message: 'User created and added to workspace',
    }, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
})
