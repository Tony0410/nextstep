import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { withAuth, type AuthenticatedRequest, hashPassword } from '@/lib/auth'
import { checkWorkspaceAccess } from '@/lib/db/workspace-access'
import { z } from 'zod'

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  forceChange: z.boolean().default(true),
})

// POST /api/workspaces/[id]/members/[memberId]/reset-password - Reset user password
export const POST = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId, memberId } = await params

    // Check access (must be owner)
    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access || access.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only owners can reset passwords' }, { status: 403 })
    }

    const body = await req.json()
    const result = resetPasswordSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { newPassword, forceChange } = result.data

    // Get the member
    const member = await prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
      include: { user: true },
    })

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Hash new password and update user
    const passwordHash = await hashPassword(newPassword)

    await prisma.user.update({
      where: { id: member.userId },
      data: {
        passwordHash,
        forcePasswordReset: forceChange,
      },
    })

    // Invalidate all existing sessions for this user
    await prisma.session.deleteMany({
      where: { userId: member.userId },
    })

    return NextResponse.json({
      success: true,
      message: forceChange
        ? 'Password reset. User must change password on next login.'
        : 'Password reset successfully.',
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
})
