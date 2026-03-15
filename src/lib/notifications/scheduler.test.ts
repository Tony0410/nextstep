import { describe, expect, it } from 'vitest'
import { isDue } from './due'

describe('notification scheduler', () => {
  it('matches only the exact scheduled minute', () => {
    expect(isDue('09:00', new Date('2024-01-15T09:00:00+08:00'))).toBe(true)
    expect(isDue('09:00', new Date('2024-01-15T08:59:00+08:00'))).toBe(false)
    expect(isDue('09:00', new Date('2024-01-15T09:01:00+08:00'))).toBe(false)
  })
})
