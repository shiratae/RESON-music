const PUBLIC_PATHS = ['/login', '/register', '/reset-password', '/dev-login', '/privacy']

export function isPublicPath(path: string): boolean {
  return path === '/' || PUBLIC_PATHS.some((publicPath) =>
    path === publicPath || path.startsWith(`${publicPath}/`)
  )
}
