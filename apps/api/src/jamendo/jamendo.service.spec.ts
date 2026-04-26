import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import { JamendoService } from './jamendo.service';

/**
 * We can't talk to the real Jamendo API in unit tests, so each test stubs
 * `global.fetch` and asserts how many times it was called. The cache layer
 * is the real `CacheService` with the in-memory fake Redis baked in below.
 */
class FakeRedis {
  private store = new Map<string, { value: string; expiresAt: number }>();
  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry || entry.expiresAt < Date.now()) return null;
    return entry.value;
  }
  async set(key: string, value: string, _mode: 'EX', ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}

function makeServices(): {
  jamendo: JamendoService;
  cache: CacheService;
  restoreFetch: () => void;
} {
  const config = {
    get: (k: string) => {
      if (k === 'JAMENDO_CLIENT_ID') return 'test_client';
      if (k === 'REDIS_URL') return 'redis://fake';
      return undefined;
    },
  } as unknown as ConfigService;

  const cache = new CacheService(config);
  Object.assign(cache as unknown as { client: FakeRedis; healthy: boolean }, {
    client: new FakeRedis(),
    healthy: true,
  });

  const jamendo = new JamendoService(config, cache);

  const realFetch = global.fetch;
  return {
    jamendo,
    cache,
    restoreFetch: () => {
      global.fetch = realFetch;
    },
  };
}

function stubFetch(payload: unknown): jest.Mock {
  const mock = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ headers: { status: 'success', results_count: 1 }, results: payload }),
  } as unknown as Response);
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

describe('JamendoService caching', () => {
  it('caches getTrending results across calls', async () => {
    const { jamendo, restoreFetch } = makeServices();
    const fetchMock = stubFetch([
      {
        id: '1',
        name: 'A',
        duration: 100,
        artist_id: '11',
        artist_name: 'X',
        album_id: '111',
        album_name: 'Y',
        album_image: 'a.jpg',
        image: 'a.jpg',
        audio: 'a.mp3',
        audiodownload: 'a.mp3',
        releasedate: '2024-01-01',
      },
    ]);

    const a = await jamendo.getTrending(5);
    const b = await jamendo.getTrending(5);

    expect(a).toEqual(b);
    expect(a).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    restoreFetch();
  });

  it('caches getByGenre per (genre, limit) pair', async () => {
    const { jamendo, restoreFetch } = makeServices();
    // Non-empty payload so cache.wrap actually caches; empty arrays are
    // intentionally not cached (see cache.service.ts shouldCache()).
    const fetchMock = stubFetch([
      {
        id: 'g',
        name: 'G',
        duration: 60,
        artist_id: 'a',
        artist_name: 'A',
        album_id: 'b',
        album_name: 'B',
        album_image: 'i.jpg',
        image: 'i.jpg',
        audio: 'g.mp3',
        audiodownload: 'g.mp3',
        releasedate: '2024-01-01',
      },
    ]);

    await jamendo.getByGenre('rock', 5);
    await jamendo.getByGenre('rock', 5);
    await jamendo.getByGenre('jazz', 5);
    await jamendo.getByGenre('rock', 10); // different limit → separate key

    expect(fetchMock).toHaveBeenCalledTimes(3);
    restoreFetch();
  });

  it('does not cache empty results from a flapping upstream', async () => {
    const { jamendo, restoreFetch } = makeServices();
    const fetchMock = stubFetch([]); // simulates Jamendo timeout / 5xx
    await jamendo.searchTracks('nothing-here', 5);
    await jamendo.searchTracks('nothing-here', 5);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    restoreFetch();
  });

  it('caches getTrackById and shares the entry across callers', async () => {
    const { jamendo, restoreFetch } = makeServices();
    const fetchMock = stubFetch([
      {
        id: '42',
        name: 'Hit',
        duration: 200,
        artist_id: 'a',
        artist_name: 'Some Artist',
        album_id: 'al',
        album_name: 'Album',
        album_image: 'i.jpg',
        image: 'i.jpg',
        audio: 'h.mp3',
        audiodownload: 'h.mp3',
        releasedate: '2024-06-01',
      },
    ]);

    const first = await jamendo.getTrackById('42');
    const second = await jamendo.getTrackById('42');

    expect(first?.title).toBe('Hit');
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    restoreFetch();
  });
});
