import { LyricsService } from './lyrics.service';
import type { CacheService } from '../cache/cache.service';

function buildCacheStub() {
  const store = new Map<string, { value: unknown; ttl: number }>();
  return {
    store,
    get: jest.fn(async (key: string) => {
      const hit = store.get(key);
      return hit ? (hit.value as unknown) : null;
    }),
    set: jest.fn(async (key: string, value: unknown, ttl: number) => {
      store.set(key, { value, ttl });
    }),
  };
}

function withFetch(fn: (input: string) => Promise<Response>) {
  // @ts-expect-error — global fetch is patched per-test
  global.fetch = jest.fn(async (input: string) => fn(input));
}

describe('LyricsService.fetch', () => {
  afterEach(() => {
    // @ts-expect-error — restore patched fetch
    delete global.fetch;
  });

  it('returns lyrics from the upstream and caches with the long TTL on hit', async () => {
    const cache = buildCacheStub();
    withFetch(
      async () =>
        new Response(JSON.stringify({ lyrics: '  verse one\nverse two  ' }), { status: 200 }),
    );
    const service = new LyricsService(cache as unknown as CacheService);
    const out = await service.fetch('Lumen Drift', 'Neon Skyline');
    expect(out.lyrics).toBe('verse one\nverse two');
    expect(out.source).toBe('lyrics.ovh');
    expect(cache.set).toHaveBeenCalledTimes(1);
    const [, , ttl] = cache.set.mock.calls[0]!;
    expect(ttl).toBeGreaterThanOrEqual(86_000); // ~24h
  });

  it('returns cached responses without hitting the provider, and tags source=cache', async () => {
    const cache = buildCacheStub();
    cache.store.set('lyrics:lumen drift::neon skyline', {
      value: {
        artist: 'Lumen Drift',
        title: 'Neon Skyline',
        lyrics: 'cached!',
        source: 'lyrics.ovh',
      },
      ttl: 86_400,
    });
    const fetchSpy = jest.fn();
    withFetch(fetchSpy as unknown as (input: string) => Promise<Response>);
    const service = new LyricsService(cache as unknown as CacheService);
    const out = await service.fetch('Lumen Drift', 'Neon Skyline');
    expect(out.lyrics).toBe('cached!');
    expect(out.source).toBe('cache');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('treats provider 404 as "no lyrics" and caches with the short TTL', async () => {
    const cache = buildCacheStub();
    withFetch(async () => new Response('{"error":"No lyrics found"}', { status: 404 }));
    const service = new LyricsService(cache as unknown as CacheService);
    const out = await service.fetch('Unknown', 'Track');
    expect(out.lyrics).toBeNull();
    expect(out.source).toBe('lyrics.ovh');
    expect(cache.set).toHaveBeenCalledTimes(1);
    const [, , ttl] = cache.set.mock.calls[0]!;
    expect(ttl).toBeLessThanOrEqual(3_600);
  });

  it('treats empty lyrics text as a miss', async () => {
    const cache = buildCacheStub();
    withFetch(async () => new Response(JSON.stringify({ lyrics: '   ' }), { status: 200 }));
    const service = new LyricsService(cache as unknown as CacheService);
    const out = await service.fetch('A', 'B');
    expect(out.lyrics).toBeNull();
  });

  it('returns a graceful "none" when the provider throws — and caches the miss with the short TTL', async () => {
    const cache = buildCacheStub();
    withFetch(async () => {
      throw new Error('network down');
    });
    const service = new LyricsService(cache as unknown as CacheService);
    const out = await service.fetch('Solene', 'Midnight Bloom');
    expect(out.lyrics).toBeNull();
    expect(out.source).toBe('none');
    // The contract for transient upstream failures is the same as the
    // Jamendo cache.wrap one (ADR-0012): we still cache the negative
    // response with a short TTL so a hammered upstream gets breathing
    // room. The "uncached" scenario is reserved for empty input.
    expect(cache.set).toHaveBeenCalledTimes(1);
    const [, , ttl] = cache.set.mock.calls[0]!;
    expect(ttl).toBeLessThanOrEqual(3_600);
  });

  it('returns "none" for empty inputs without touching cache or fetch', async () => {
    const cache = buildCacheStub();
    const fetchSpy = jest.fn();
    withFetch(fetchSpy as unknown as (input: string) => Promise<Response>);
    const service = new LyricsService(cache as unknown as CacheService);
    const out = await service.fetch('  ', '');
    expect(out).toEqual({ artist: '  ', title: '', lyrics: null, source: 'none' });
    expect(cache.get).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('builds case-insensitive cache keys so capitalization quirks share a row', async () => {
    const cache = buildCacheStub();
    withFetch(async () => new Response(JSON.stringify({ lyrics: 'shared' }), { status: 200 }));
    const service = new LyricsService(cache as unknown as CacheService);
    await service.fetch('Lumen Drift', 'Neon Skyline');
    const out = await service.fetch('lumen drift', 'NEON SKYLINE');
    expect(out.lyrics).toBe('shared');
    expect(out.source).toBe('cache');
    expect((global.fetch as jest.Mock).mock.calls).toHaveLength(1);
  });
});
