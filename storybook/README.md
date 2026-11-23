# Storybook

RESON component development uses Storybook as the isolated UI layer alongside Jest and Playwright.

## Local usage

From the repository root:

```bash
npm install
npm install --prefix storybook
npm --prefix storybook run dev
```

Open Storybook on port 6006.

Build the static Storybook:

```bash
npm --prefix storybook run build
```

Run Storybook component and accessibility tests in headless Chromium:

```bash
npx --prefix storybook playwright install chromium
npm --prefix storybook run test:a11y
```

## Initial scope

Stories currently cover:

- ThemeToggle dark/light states
- SupportButton success/error interaction boundaries
- BoostButton available/limit-reached states
- Player default, long-content, and queue-control states

API-dependent components use Storybook-local fetch mocks so stories do not require Supabase, Stripe, or R2.

## Accessibility gate

`@storybook/addon-a11y` and `@storybook/addon-vitest` are enabled globally. Story tests run in a real headless Chromium browser through Vitest browser mode.

The project-level `a11y.test` behavior is `error`, so automated axe-core violations fail the Storybook CI job. New stories inherit this gate by default instead of requiring per-story opt-in.

The static Storybook build runs only after the accessibility suite passes.

Stripe Elements itself is intentionally not rendered as a standalone story yet because its hosted payment UI requires a dedicated Stripe test wrapper. Payment entry remains covered indirectly through its parent components and Playwright network-boundary tests.
