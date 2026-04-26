import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

/**
 * Tiny Redis-backed JSON cache. The whole API gracefully degrades to a
 * "no-cache" mode whenever Redis is unreachable or `REDIS_URL` is unset —
 * `get()` returns `null`, `set()` is a no-op, and the rest of the request
 * lifecycle proceeds unchanged. See ADR-0012 for the rationale.
 */
@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: Redis | null = null;
  private healthy = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.logger.warn('REDIS_URL not set; cache disabled (every request hits upstream).');
      return;
    }
    try {
      this.client = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy: (times) => Math.min(times * 200, 2000),
      });
      this.client.on('error', (err) => {
        if (this.healthy) {
          this.logger.warn(`Redis error: ${err.message} — degrading to no-cache.`);
        }
        this.healthy = false;
      });
      this.client.on('ready', () => {
        if (!this.healthy) this.logger.log('Redis cache ready.');
        this.healthy = true;
      });
      void this.client.connect().catch((err: Error) => {
        this.logger.warn(`Redis connect failed: ${err.message} — running without cache.`);
      });
    } catch (err) {
      this.logger.warn(`Redis init failed: ${(err as Error).message} — running without cache.`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }

  isHealthy(): boolean {
    return this.healthy;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.healthy) return null;
    try {
      const raw = await this.client.get(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(`cache get(${key}) failed: ${(err as Error).message}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (!this.client || !this.healthy) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(`cache set(${key}) failed: ${(err as Error).message}`);
    }
  }

  /**
   * Get the value at `key`, or compute it via `loader`, store with TTL, and
   * return it. If Redis is down or the loader throws, we still return the
   * loader's result (or rethrow) so callers behave identically with or
   * without cache.
   *
   * Empty results are not cached. `JamendoService.fetch()` returns `[]` on
   * timeouts and non-200 responses (it's defensive on purpose); caching
   * those would pin a transient outage for the full TTL, which is exactly
   * the failure mode ADR-0012 calls out. Skipping `null`, `undefined`, and
   * empty arrays means a flap re-tries on the very next request instead of
   * waiting 10 minutes.
   */
  async wrap<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const fresh = await loader();
    if (this.shouldCache(fresh)) {
      await this.set(key, fresh, ttlSeconds);
    }
    return fresh;
  }

  private shouldCache(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }

  async invalidate(prefix: string): Promise<void> {
    if (!this.client || !this.healthy) return;
    try {
      const stream = this.client.scanStream({ match: `${prefix}*`, count: 100 });
      const keys: string[] = [];
      for await (const batch of stream) {
        for (const k of batch as string[]) keys.push(k);
      }
      if (keys.length) await this.client.del(...keys);
    } catch (err) {
      this.logger.warn(`cache invalidate(${prefix}) failed: ${(err as Error).message}`);
    }
  }
}
