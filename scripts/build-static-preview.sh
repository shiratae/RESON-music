#!/usr/bin/env bash
# Static preview build for GitHub Pages.
# Server-only code (API routes, middleware) can't run on Pages, so we
# temporarily remove them for this build only and restore them afterwards.
set -euo pipefail

cd "$(dirname "$0")/.."

restore() {
  [ -d /tmp/reson-api-bak ] && rm -rf app/api && mv /tmp/reson-api-bak app/api
  [ -f /tmp/reson-middleware-bak ] && rm -f middleware.ts && mv /tmp/reson-middleware-bak middleware.ts
  [ -f /tmp/reson-privacy-page-bak ] && rm -f 'app/[locale]/privacy/page.tsx' && mv /tmp/reson-privacy-page-bak 'app/[locale]/privacy/page.tsx'
}
trap restore EXIT

[ -d app/api ] && mv app/api /tmp/reson-api-bak
[ -f middleware.ts ] && mv middleware.ts /tmp/reson-middleware-bak

# The privacy page is intentionally force-dynamic in production so operator
# details can come from runtime configuration. GitHub Pages has no runtime
# server, so render that page statically only for this disposable preview build.
if [ -f 'app/[locale]/privacy/page.tsx' ]; then
  cp 'app/[locale]/privacy/page.tsx' /tmp/reson-privacy-page-bak
  sed -i "/export const dynamic = 'force-dynamic'/d" 'app/[locale]/privacy/page.tsx'
fi

# Next.js 16.4 Turbopack can fail during this second, static-export build.
# Use the supported Webpack builder for the disposable GitHub Pages preview.
STATIC_PREVIEW=true \
STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-sk_test_placeholder}" \
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-placeholder}" \
NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://placeholder.supabase.co}" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-placeholder}" \
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-placeholder}" \
npx next build --webpack

# next-intl renders /ja and /en during static export. Production middleware
# removes the default-locale prefix; mirror that behavior for GitHub Pages.
if [ -d out/ja ]; then
  cp -a out/ja/. out/
  rm -rf out/ja
fi
