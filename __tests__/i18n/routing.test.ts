import {
  defaultLocale,
  getLocalePathname,
  localeDetection,
  localizePathname,
} from '@/i18n/locales'

describe('i18n routing helpers', () => {
  it('disables browser locale detection so prefixless URLs stay Japanese', () => {
    expect(localeDetection).toBe(false)
  })

  it('keeps prefixless paths in the default locale', () => {
    expect(getLocalePathname('/login')).toEqual({
      locale: defaultLocale,
      pathname: '/login',
    })
    expect(localizePathname('/login', 'ja')).toBe('/login')
  })

  it('extracts and creates English locale prefixes', () => {
    expect(getLocalePathname('/en/reset-password/confirm')).toEqual({
      locale: 'en',
      pathname: '/reset-password/confirm',
    })
    expect(localizePathname('/reset-password/confirm', 'en')).toBe(
      '/en/reset-password/confirm'
    )
  })

  it('normalizes locale roots', () => {
    expect(getLocalePathname('/en')).toEqual({
      locale: 'en',
      pathname: '/',
    })
    expect(localizePathname('/', 'en')).toBe('/en')
  })
})
