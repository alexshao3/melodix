import { defineConfig, devices } from '@playwright/test';

/**
 * Melodix E2E configuration. The single chromium project hits the production
 * builds of `apps/web` (port 3000) and `apps/api` (port 4000), with the API
 * deliberately booted *without* `JAMENDO_CLIENT_ID` so it serves the
 * `DEMO_TRACKS` bundle. That keeps CI hermetic — no Postgres, no external
 * network, fully reproducible. See ADR-0015.
 *
 * The autoplay policy flag lets the audio element move into a play state
 * synchronously after a user gesture in headless mode; without it the player
 * provider's `audio.play()` rejects and the mini-player never paints.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      args: ['--autoplay-policy=no-user-gesture-required'],
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @melodix/api start',
      url: 'http://localhost:4000/api/health',
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: 'production',
        PORT: '4000',
        // No JAMENDO_CLIENT_ID → DEMO_TRACKS fallback. DATABASE_URL is
        // forwarded when set so the authed spec suite (gated by
        // MELODIX_E2E_AUTHED) can hit a real Postgres; smoke specs ignore
        // it because every authed endpoint is auth-gated. JWT_SECRET is
        // also forwarded so the API can issue tokens during the authed
        // login flow. See ADR-0018.
        JAMENDO_CLIENT_ID: '',
        CORS_ORIGIN: 'http://localhost:3000',
        ...(process.env.DATABASE_URL ? { DATABASE_URL: process.env.DATABASE_URL } : {}),
        ...(process.env.JWT_SECRET ? { JWT_SECRET: process.env.JWT_SECRET } : {}),
      },
    },
    {
      command: 'pnpm --filter @melodix/web start',
      url: 'http://localhost:3000',
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        NEXT_PUBLIC_API_URL: 'http://localhost:4000',
      },
    },
  ],
});
