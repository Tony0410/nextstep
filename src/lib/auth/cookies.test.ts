import { afterEach, describe, expect, it } from 'vitest'
import { shouldUseSecureCookies } from './cookies'

const originalCookieSecure = process.env.COOKIE_SECURE

afterEach(() => {
  process.env.COOKIE_SECURE = originalCookieSecure
})

describe('shouldUseSecureCookies', () => {
  it('uses secure cookies for forwarded https requests even in development', () => {
    expect(shouldUseSecureCookies({ forwardedProto: 'https' })).toBe(true)
  })

  it('uses secure cookies when the request origin is https', () => {
    expect(
      shouldUseSecureCookies({ origin: 'https://debianvm.kangaroo-eel.ts.net:10000' })
    ).toBe(true)
  })

  it('allows an explicit insecure override', () => {
    process.env.COOKIE_SECURE = 'false'
    expect(shouldUseSecureCookies({ forwardedProto: 'https' })).toBe(false)
  })
})
