import { describe, it, expect } from 'vitest'
import { isAdmin, ADMIN_EMAIL } from '@/lib/isAdmin'

describe('M5 — lib/isAdmin centralise la verification admin', () => {
  it('reconnaît l\'email admin', () => {
    expect(isAdmin({ email: ADMIN_EMAIL })).toBe(true)
  })

  it('refuse un autre email', () => {
    expect(isAdmin({ email: 'quelquun@example.com' })).toBe(false)
  })

  it('refuse un user absent (non connecté)', () => {
    expect(isAdmin(null)).toBe(false)
    expect(isAdmin(undefined)).toBe(false)
  })
})
