import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import {
  verifyPassword,
  createSession,
  getSessionCookieConfig,
  checkLoginRateLimit,
  recordLoginAttempt,
} from '@/lib/auth'
import { loginSchema } from '@/lib/validation'
import { withRateLimit } from '@/lib/auth/middleware'

async function handler(req: NextRequest) {
  try {
    const body = await req.json()
    const result = loginSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { email, password } = result.data
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]

    // Check rate limit
    const rateLimit = await checkLoginRateLimit(email.toLowerCase(), ipAddress)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed attempts. Please try again in ${rateLimit.lockoutMinutes} minutes.`,
        },
        { status: 429 }
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        forcePasswordReset: true,
      },
    })

    if (!user) {
      await recordLoginAttempt(email.toLowerCase(), false, ipAddress)
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password
    const valid = await verifyPassword(user.passwordHash, password)
    if (!valid) {
      await recordLoginAttempt(email.toLowerCase(), false, ipAddress)
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Record successful login and update lastLoginAt
    await Promise.all([
      recordLoginAttempt(email.toLowerCase(), true, ipAddress),
      prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
    ])

    // Create session
    const userAgent = req.headers.get('user-agent') || undefined
    const token = await createSession(user.id, userAgent, ipAddress)
    const cookieConfig = getSessionCookieConfig(token, {
      forwardedProto: req.headers.get('x-forwarded-proto'),
      origin: req.headers.get('origin'),
      referer: req.headers.get('referer'),
    })

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      forcePasswordReset: user.forcePasswordReset,
    })

    response.cookies.set(cookieConfig)

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handler)
