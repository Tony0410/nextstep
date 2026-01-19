import { NextRequest, NextResponse } from 'next/server'
import { getSession, SessionData } from './session'
import { checkApiRateLimit } from './rate-limit'

export interface AuthenticatedRequest extends NextRequest {
  session: SessionData
}

type RouteHandler = (req: NextRequest, context: { params: Promise<Record<string, string>> }) => Promise<NextResponse>

type AuthenticatedRouteHandler = (req: AuthenticatedRequest, context: { params: Promise<Record<string, string>> }) => Promise<NextResponse>

export function withAuth(handler: AuthenticatedRouteHandler): RouteHandler {
  return async (req: NextRequest, context) => {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const rateLimit = checkApiRateLimit(ip)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'Retry-After': '60',
          },
        }
      )
    }

    // Authentication
    const session = await getSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Attach session to request
    const authenticatedReq = req as AuthenticatedRequest
    authenticatedReq.session = session

    return handler(authenticatedReq, context)
  }
}

export function withRateLimit(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, context) => {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const rateLimit = checkApiRateLimit(ip)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'Retry-After': '60',
          },
        }
      )
    }

    const response = await handler(req, context)
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString())
    return response
  }
}
