# Playwright E2E

The E2E suite runs public smoke tests, authenticated listener/artist flows, and critical mocked browser journeys against an isolated local Supabase stack.

## Requirements

- Node.js 20+
- Docker-compatible container runtime
- Supabase CLI 2.117.0
- Chromium installed by Playwright

## Local run

From the repository root:

```bash
npm install
npm install --prefix e2e
npx --prefix e2e playwright install chromium
supabase start
```

Export the local Supabase credentials into the variables used by the Next.js app:

```bash
set -a
source <(supabase status -o env)
set +a

export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
export ENABLE_DEV_SEED_ACCOUNT=true
export CRON_SECRET=e2e-local-cron-secret
export E2E_CRON_SECRET=e2e-local-cron-secret

npm --prefix e2e test
```

The Playwright config starts the root Next.js development server automatically on `127.0.0.1:3000`.

When finished:

```bash
supabase stop
```

## Projects

- `public-chromium`: landing, login, register, privacy, navigation, and middleware security headers
- `setup`: creates an isolated development artist account through the development-only seed endpoint, signs in, and saves browser authentication state
- `authenticated-chromium`: reuses that `storageState` for private routes and critical browser flows
- `visual-mobile-chromium`: runs selected private routes at a Pixel 5 CSS viewport, fails on horizontal page overflow, and compares each viewport against committed golden screenshots
- scheduled-only critical projects: Desktop Firefox, Desktop Safari/WebKit, and iPhone 12/WebKit emulation

The seed endpoint remains disabled unless both development mode and `ENABLE_DEV_SEED_ACCOUNT=true` are active. CI uses only the local Supabase service-role key.

## Critical browser flows

The critical-flow suite covers:

- playlist creation
- playlist track switching and heart support UI
- Standard checkout initiation
- Student email/code verification before checkout
- upload file-type validation
- album creation from the upload screen
- a valid WAV upload through a mocked signed upload URL, mocked R2 PUT, AI check, and fingerprint endpoint

Visual regression goldens live in `e2e/visual-baselines/`. CI compares Home, Profile, Pricing, Privacy Requests, Messages, and Upload against those committed PNGs with Playwright `toHaveScreenshot()`, allowing at most 0.5% changed pixels. CI never auto-updates the goldens. Current screenshots are still uploaded as 14-day artifacts for review.

Stripe and Cloudflare R2 are never contacted by these tests. The browser requests are intercepted at the network boundary and their payloads are asserted. The actual WAV decode/upload browser path is kept on Chromium; the surrounding critical UI flows run in the scheduled Firefox/WebKit projects.

## CI browser matrix

Pull requests and ordinary pushes run Chromium for fast feedback. A weekly scheduled run installs Chromium, Firefox, and WebKit, then executes the critical mocked flows on Firefox, desktop WebKit, and mobile WebKit in addition to the Chromium suite.
