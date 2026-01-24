import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { hashPassword, verifyPassword, withAuth, type AuthenticatedRequest } from '@/lib/auth'
import { z } from 'zod'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json()
    const result = changePasswordSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { currentPassword, newPassword } = result.data
    const userId = req.session.user.id

    // Get current user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify current password
    const validPassword = await verifyPassword(user.passwordHash, currentPassword)
    if (!validPassword) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
    }

    // Hash new password and update user
    const newPasswordHash = await hashPassword(newPassword)
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        forcePasswordReset: false, // Clear the forced reset flag
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
  }
})
