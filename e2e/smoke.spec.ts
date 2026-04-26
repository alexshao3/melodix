import { expect, test } from '@playwright/test';
import type { Track } from '@melodix/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Golden-path smoke. The API is booted without `JAMENDO_CLIENT_ID` so every
 * Jamendo call falls back to the bundled `DEMO_TRACKS` seed (36 tracks). That
 * means these assertions run against deterministic fixtures and don't depend
 * on the live Jamendo network. See ADR-0015.
 */

async function firstTrendingTrack(
  request: import('@playwright/test').APIRequestContext,
): Promise<Track> {
  const res = await request.get(`${API_BASE}/api/tracks/trending?limit=1`);
  expect(res.ok(), `GET /api/tracks/trending failed: ${res.status()}`).toBeTruthy();
  const tracks = (await res.json()) as Track[];
  expect(tracks.length).toBeGreaterThan(0);
  return tracks[0]!;
}

test.describe('home @smoke', () => {
  test('renders Trending and Fresh releases sections with cards', async ({ page, request }) => {
    const first = await firstTrendingTrack(request);

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Trending now' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Fresh releases' })).toBeVisible();

    // The TrackCard is a `<button>` whose accessible name comes from its
    // text content — the track title plus artist. We look the title up
    // server-side so the assertion is deterministic across demo seed
    // changes.
    await expect(
      page.getByRole('button', { name: new RegExp(first.title, 'i') }).first(),
    ).toBeVisible();
  });

  test('clicking a track surfaces the global player bar with the chosen title', async ({
    page,
    request,
  }) => {
    const first = await firstTrendingTrack(request);

    await page.goto('/');
    const card = page.getByRole('button', { name: new RegExp(first.title, 'i') }).first();
    await expect(card).toBeVisible();
    await card.click();

    // PlayerBar mounts only when `currentTrack` is set, and its primary
    // toggle exposes either an "Play" or "Pause" aria-label depending on
    // whether the audio actually started. We accept either — the CI
    // environment cannot guarantee a live Jamendo stream loads, but the
    // player-bar appearing at all proves the click reached the engine.
    const toggle = page.getByRole('button', { name: /^(Play|Pause)$/ });
    await expect(toggle).toBeVisible();

    // The bar shows the chosen title text. There may be two occurrences
    // (the card and the bar) — `last()` is the bar.
    await expect(page.getByText(first.title, { exact: true }).last()).toBeVisible();
  });
});

test.describe('search @smoke', () => {
  test('navigating to /search?q=... renders the search heading', async ({ page }) => {
    await page.goto('/search?q=demo');
    // The search page renders a top-level heading regardless of result
    // count; we don't assert on cards because the demo seed is small and
    // the matcher is intentionally lenient.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

test.describe('library guest @smoke', () => {
  test('shows the sign-in CTA when not authenticated', async ({ page }) => {
    await page.goto('/library');
    await expect(page.getByRole('heading', { name: 'Your library' })).toBeVisible();
    // The CTA is a `<Link><GradientButton>Sign in</GradientButton></Link>`
    // — i.e. a button text inside an anchor. We assert on the button role
    // so we don't depend on the link wrapper.
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });
});
