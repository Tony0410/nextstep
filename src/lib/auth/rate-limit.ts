import { prisma } from '@/lib/db/prisma'

const LOGIN_MAX_ATTEMPTS = parseInt(process.env.LOGIN_MAX_ATTEMPTS || '5', 10)
const LOGIN_LOCKOUT_MINUTES = parseInt(process.env.LOGIN_LOCKOUT_MINUTES || '15', 10)

export interface RateLimitResult {
  allowed: boolean
  remainingAttempts: number
  lockoutMinutes?: number
}

export async function checkLoginRateLimit(
  email: string,
  ipAddress?: string
): Promise<RateLimitResult> {
  const windowStart = new Date()
  windowStart.setMinutes(windowStart.getMinutes() - LOGIN_LOCKOUT_MINUTES)

  // Count recent failed attempts for this email
  const recentAttempts = await prisma.loginAttempt.count({
    where: {
      email: email.toLowerCase(),
      success: false,
      createdAt: { gte: windowStart },
    },
  })

  if (recentAttempts >= LOGIN_MAX_ATTEMPTS) {
    return {
      allowed: false,
      remainingAttempts: 0,
      lockoutMinutes: LOGIN_LOCKOUT_MINUTES,
    }
  }

  return {
    allowed: true,
    remainingAttempts: LOGIN_MAX_ATTEMPTS - recentAttempts,
  }
}

export async function recordLoginAttempt(
  email: string,
  success: boolean,
  ipAddress?: string
): Promise<void> {
  await prisma.loginAttempt.create({
    data: {
      email: email.toLowerCase(),
      success,
      ipAddress,
    },
  })

  // Clean up old attempts (older than 24 hours)
  const cutoff = new Date()
  cutoff.setHours(cutoff.getHours() - 24)

  await prisma.loginAttempt.deleteMany({
    where: { createdAt: { lt: cutoff } },
  }).catch(() => {})
}

// Simple in-memory rate limiter for API endpoints
const requestCounts = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10)

export function checkApiRateLimit(identifier: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = requestCounts.get(identifier)

  if (!entry || entry.resetAt < now) {
    requestCounts.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 }
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - entry.count }
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of requestCounts.entries()) {
    if (value.resetAt < now) {
      requestCounts.delete(key)
    }
  }
}, 60000)
