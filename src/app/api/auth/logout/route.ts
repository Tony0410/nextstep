import { NextResponse } from 'next/server'
import { getSession, deleteSession, getSessionCookieClearConfig } from '@/lib/auth'

export async function POST() {
  try {
    const session = await getSession()

    if (session) {
      await deleteSession(session.sessionId)
    }

    const cookieConfig = getSessionCookieClearConfig()
    const response = NextResponse.json({ message: 'Logged out successfully' })
    response.cookies.set(cookieConfig)

    return response
  } catch (error) {
    console.error('Logout error:', error)
    // Still clear the cookie even on error
    const cookieConfig = getSessionCookieClearConfig()
    const response = NextResponse.json({ message: 'Logged out' })
    response.cookies.set(cookieConfig)
    return response
  }
}
