import { expect, test } from '@playwright/test';
import type { Track } from '@melodix/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const SEED_EMAIL = 'demo@melodix.app';
const SEED_USERNAME = 'demo';
const SEED_PASSWORD = 'melodix123';

/**
 * DB-backed flows. The CI workflow stands up a Postgres service, runs
 * `prisma db push` + `prisma:seed` (creates user "demo"/"melodix123") and
 * sets `MELODIX_E2E_AUTHED=1`. Locally these specs are skipped unless the
 * developer opts in by exporting the same flag and pointing DATABASE_URL at
 * a running Postgres. See ADR-0018.
 */
test.skip(
  process.env.MELODIX_E2E_AUTHED !== '1',
  'authed specs require a Postgres-backed API (set MELODIX_E2E_AUTHED=1)',
);

async function loginViaApi(
  request: import('@playwright/test').APIRequestContext,
): Promise<{ token: string; user: { id: string; username: string } }> {
  const res = await request.post(`${API_BASE}/api/auth/login`, {
    data: { emailOrUsername: SEED_EMAIL, password: SEED_PASSWORD },
  });
  expect(res.ok(), `login failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  return res.json();
}

async function firstTrendingTrack(
  request: import('@playwright/test').APIRequestContext,
): Promise<Track> {
  const res = await request.get(`${API_BASE}/api/tracks/trending?limit=1`);
  expect(res.ok()).toBeTruthy();
  const tracks = (await res.json()) as Track[];
  expect(tracks.length).toBeGreaterThan(0);
  return tracks[0]!;
}

async function setLocalStorageToken(page: import('@playwright/test').Page, token: string) {
  // The web app reads `localStorage.melodix.token` in `apps/web/src/lib/api.ts`.
  // Seeding the value before the first navigation lets us skip the UI form
  // for the like/history specs and keep them focused on the DB-backed flow
  // they're actually exercising.
  await page.addInitScript((t: string) => {
    window.localStorage.setItem('melodix.token', t);
  }, token);
}

test.describe('login flow @authed', () => {
  test('signing in routes to /library and replaces the guest CTA with the user library', async ({
    page,
  }) => {
    await page.goto('/login');
    // The login form shares the email input across modes; the demo seed is
    // matched by username `demo` against the `emailOrUsername` field.
    await page.getByPlaceholder('Email or username').fill(SEED_USERNAME);
    await page.getByPlaceholder('Password').fill(SEED_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/library$/);
    // Guest CTA must NOT be visible — the page should now show the
    // owner-only library sections.
    await expect(page.getByText(/sign in to save likes/i)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Your playlists' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Liked songs' })).toBeVisible();
  });
});

test.describe('liked songs @authed', () => {
  test('liking a track via the API surfaces it in /library Liked songs', async ({
    page,
    request,
  }) => {
    const { token } = await loginViaApi(request);
    const track = await firstTrendingTrack(request);

    const likeRes = await request.post(`${API_BASE}/api/me/likes/${encodeURIComponent(track.id)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(likeRes.ok(), `like failed: ${likeRes.status()}`).toBeTruthy();

    await setLocalStorageToken(page, token);
    await page.goto('/library');

    await expect(page.getByRole('heading', { name: 'Liked songs' })).toBeVisible();
    // The track title may render in multiple sections (e.g. recently
    // played) — `first()` is enough to prove the like landed.
    await expect(page.getByText(track.title, { exact: true }).first()).toBeVisible();
  });
});

test.describe('server history @authed', () => {
  test('recording a play via the API surfaces the track in /library Recently played', async ({
    page,
    request,
  }) => {
    const { token } = await loginViaApi(request);
    const track = await firstTrendingTrack(request);

    const recordRes = await request.post(`${API_BASE}/api/me/history`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { trackId: track.id },
    });
    expect(recordRes.ok(), `recordPlay failed: ${recordRes.status()}`).toBeTruthy();

    await setLocalStorageToken(page, token);
    await page.goto('/library');

    await expect(page.getByRole('heading', { name: 'Recently played' })).toBeVisible();
    await expect(page.getByText(track.title, { exact: true }).first()).toBeVisible();
  });
});
