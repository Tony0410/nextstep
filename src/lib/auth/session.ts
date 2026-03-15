import { cookies } from 'next/headers'
import { prisma } from '@/lib/db/prisma'
import { nanoid } from 'nanoid'
import { shouldUseSecureCookies } from './cookies'

const SESSION_COOKIE_NAME = 'nextstep_session'
const SESSION_MAX_AGE_DAYS = parseInt(process.env.SESSION_MAX_AGE_DAYS || '30', 10)

export interface SessionUser {
  id: string
  email: string
  name: string
}

export interface SessionData {
  user: SessionUser
  sessionId: string
}

export async function createSession(
  userId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<string> {
  const token = nanoid(64)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_MAX_AGE_DAYS)

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
      userAgent,
      ipAddress,
    },
  })

  return token
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!sessionToken) {
    return null
  }

  const session = await prisma.session.findUnique({
    where: { token: sessionToken },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  })

  if (!session || session.expiresAt < new Date()) {
    // Clean up expired session
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {})
    }
    return null
  }

  return {
    user: session.user,
    sessionId: session.id,
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => {})
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } })
}

export function setSessionCookie(token: string): void {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_MAX_AGE_DAYS)

  // Note: This is for server-side use. The actual cookie setting
  // happens in the API route response
}

interface CookieRequestMetadata {
  forwardedProto?: string | null
  origin?: string | null
  referer?: string | null
}

export function getSessionCookieConfig(token: string, metadata?: CookieRequestMetadata) {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_MAX_AGE_DAYS)

  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: shouldUseSecureCookies(metadata),
    sameSite: 'lax' as const,
    expires: expiresAt,
    path: '/',
  }
}

export function getSessionCookieClearConfig(metadata?: CookieRequestMetadata) {
  return {
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: shouldUseSecureCookies(metadata),
    sameSite: 'lax' as const,
    expires: new Date(0),
    path: '/',
  }
}
