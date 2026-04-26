import { CacheService } from './cache.service';

/**
 * Lightweight in-memory stand-in for ioredis. We don't exercise the real
 * Redis client here — that's an integration concern — we only verify the
 * `wrap` semantics and the graceful-degradation contract.
 */
type StoredEntry = { value: string; expiresAt: number };

class FakeRedis {
  private store = new Map<string, StoredEntry>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, _mode: 'EX', ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}

function makeService({ withRedis }: { withRedis: boolean }): CacheService {
  const config = {
    get: (k: string) => (k === 'REDIS_URL' && withRedis ? 'redis://fake' : undefined),
  } as unknown as ConstructorParameters<typeof CacheService>[0];
  const svc = new CacheService(config);
  if (withRedis) {
    // Bypass real ioredis init; install our fake client + healthy flag.
    const fake = new FakeRedis();
    Object.assign(svc as unknown as { client: FakeRedis; healthy: boolean }, {
      client: fake,
      healthy: true,
    });
  }
  return svc;
}

describe('CacheService', () => {
  it('falls back to no-cache when REDIS_URL is unset', async () => {
    const svc = makeService({ withRedis: false });
    expect(svc.isHealthy()).toBe(false);
    expect(await svc.get('any')).toBeNull();
    await svc.set('any', { x: 1 }, 60); // no-throw
    expect(await svc.get('any')).toBeNull();
  });

  it('wrap() invokes loader on miss, caches, and skips loader on hit', async () => {
    const svc = makeService({ withRedis: true });
    let calls = 0;
    const loader = async () => {
      calls += 1;
      return { foo: 'bar', n: calls };
    };

    const first = await svc.wrap('k:test', 60, loader);
    const second = await svc.wrap('k:test', 60, loader);

    expect(first).toEqual({ foo: 'bar', n: 1 });
    expect(second).toEqual({ foo: 'bar', n: 1 });
    expect(calls).toBe(1);
  });

  it('wrap() does not cache null/undefined results', async () => {
    const svc = makeService({ withRedis: true });
    let calls = 0;
    const loader = async () => {
      calls += 1;
      return null;
    };
    const first = await svc.wrap('k:null', 60, loader);
    const second = await svc.wrap('k:null', 60, loader);
    expect(first).toBeNull();
    expect(second).toBeNull();
    expect(calls).toBe(2); // re-invoked because nulls aren't cached
  });

  it("wrap() does not cache empty arrays (so a transient upstream outage isn't pinned for the full TTL)", async () => {
    const svc = makeService({ withRedis: true });
    let calls = 0;
    const loader = async () => {
      calls += 1;
      return [] as string[];
    };
    await svc.wrap('k:empty', 60, loader);
    await svc.wrap('k:empty', 60, loader);
    expect(calls).toBe(2);
  });

  it('wrap() still caches non-empty arrays', async () => {
    const svc = makeService({ withRedis: true });
    let calls = 0;
    const loader = async () => {
      calls += 1;
      return ['hit'];
    };
    await svc.wrap('k:nonempty', 60, loader);
    const second = await svc.wrap('k:nonempty', 60, loader);
    expect(second).toEqual(['hit']);
    expect(calls).toBe(1);
  });

  it('wrap() always invokes loader when Redis is unavailable', async () => {
    const svc = makeService({ withRedis: false });
    let calls = 0;
    const loader = async () => {
      calls += 1;
      return { hit: calls };
    };
    await svc.wrap('k:nostore', 60, loader);
    await svc.wrap('k:nostore', 60, loader);
    expect(calls).toBe(2);
  });

  it('wrap() propagates loader errors verbatim', async () => {
    const svc = makeService({ withRedis: true });
    const loader = async () => {
      throw new Error('upstream failed');
    };
    await expect(svc.wrap('k:err', 60, loader)).rejects.toThrow('upstream failed');
  });
});
