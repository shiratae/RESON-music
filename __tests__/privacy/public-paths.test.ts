import { isPublicPath } from '@/lib/auth/public-paths'

describe('public routes', () => {
  it('allows only the exact public page and its subroutes', () => {
    expect(isPublicPath('/')).toBe(true)
    expect(isPublicPath('/privacy')).toBe(true)
    expect(isPublicPath('/reset-password/confirm')).toBe(true)
    expect(isPublicPath('/privacy-requests')).toBe(false)
    expect(isPublicPath('/register-artist')).toBe(false)
    expect(isPublicPath('/admin/privacy-requests')).toBe(false)
  })
})
