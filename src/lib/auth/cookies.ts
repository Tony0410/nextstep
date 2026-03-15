interface CookieRequestMetadata {
  forwardedProto?: string | null
  origin?: string | null
  referer?: string | null
}

export function shouldUseSecureCookies(metadata: CookieRequestMetadata = {}): boolean {
  if (process.env.COOKIE_SECURE === 'false') {
    return false
  }

  const forwardedProto = metadata.forwardedProto?.split(',')[0]?.trim().toLowerCase()
  if (forwardedProto) {
    return forwardedProto === 'https'
  }

  if (metadata.origin?.startsWith('https://') || metadata.referer?.startsWith('https://')) {
    return true
  }

  return process.env.NODE_ENV === 'production'
}
