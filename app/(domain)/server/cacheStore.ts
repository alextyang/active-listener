import { Redis } from "@upstash/redis";
import { getServerEnv } from "./env";

export interface CacheStore {
    get<T>(key: string): Promise<T | undefined>;
    set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
    del(key: string): Promise<void>;
    acquireLock(key: string, ttlSeconds: number): Promise<boolean>;
    releaseLock(key: string): Promise<void>;
}

class MemoryCacheStore implements CacheStore {
    private readonly values = new Map<string, { raw: string, expiresAt: number }>();

    async get<T>(key: string): Promise<T | undefined> {
        const entry = this.values.get(key);
        if (!entry) return undefined;
        if (Date.now() >= entry.expiresAt) {
            this.values.delete(key);
            return undefined;
        }

        return JSON.parse(entry.raw) as T;
    }

    async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
        if (ttlSeconds <= 0) {
            this.values.delete(key);
            return;
        }

        this.values.set(key, {
            raw: JSON.stringify(value),
            expiresAt: Date.now() + ttlSeconds * 1000,
        });
    }

    async del(key: string): Promise<void> {
        this.values.delete(key);
    }

    async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
        if (ttlSeconds <= 0) return false;

        const existing = await this.get<string>(key);
        if (existing) return false;
        await this.set(key, "locked", ttlSeconds);
        return true;
    }

    async releaseLock(key: string): Promise<void> {
        await this.del(key);
    }
}

class UpstashCacheStore implements CacheStore {
    constructor(private readonly redis: Redis) { }

    async get<T>(key: string): Promise<T | undefined> {
        const value = await this.redis.get<string>(key);
        if (!value || typeof value !== "string") return undefined;
        return JSON.parse(value) as T;
    }

    async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
        await this.redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
    }

    async del(key: string): Promise<void> {
        await this.redis.del(key);
    }

    async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
        const result = await this.redis.set(key, "locked", { nx: true, ex: ttlSeconds });
        return result === "OK";
    }

    async releaseLock(key: string): Promise<void> {
        await this.redis.del(key);
    }
}

let cacheStore: CacheStore | undefined;

export function createMemoryCacheStore(): CacheStore {
    return new MemoryCacheStore();
}

export function createUpstashCacheStore(redis: Redis): CacheStore {
    return new UpstashCacheStore(redis);
}

export function getCacheStore(): CacheStore {
    if (cacheStore) return cacheStore;

    const env = getServerEnv();
    if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
        cacheStore = createUpstashCacheStore(new Redis({
            url: env.UPSTASH_REDIS_REST_URL,
            token: env.UPSTASH_REDIS_REST_TOKEN,
        }));
        return cacheStore;
    }

    cacheStore = createMemoryCacheStore();
    return cacheStore;
}
