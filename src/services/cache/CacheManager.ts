import { Redis } from 'ioredis';
import logger from '../../config/logging';
import redisClient from '../../config/redis';

interface CacheOptions {
  prefix?: string;
  defaultTTL?: number;
}

interface CacheEntry {
  value: any;
  expiresAt?: number;
}

export class CacheManager {
  private readonly prefix: string;
  private readonly defaultTTL: number;
  private readonly redis: Redis;

  constructor(options: CacheOptions = {}) {
    this.prefix = options.prefix || 'cache:';
    this.defaultTTL = options.defaultTTL || 3600; // 1 hour
    this.redis = redisClient;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get(key: string): Promise<any> {
    try {
      const value = await this.redis.get(this.getKey(key));
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(this.getKey(key), ttl, serializedValue);
      } else {
        await this.redis.set(this.getKey(key), serializedValue);
      }
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(this.getKey(key));
    } catch (error) {
      logger.error('Cache delete error:', error);
    }
  }

  async clear(pattern?: string): Promise<void> {
    try {
      const searchPattern = pattern ? `${this.prefix}${pattern}*` : `${this.prefix}*`;
      const keys = await this.redis.keys(searchPattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }

  async remember(key: string, ttl: number, callback: () => Promise<any>): Promise<any> {
    const cachedValue = await this.get(key);
    if (cachedValue !== null) {
      return cachedValue;
    }

    const value = await callback();
    await this.set(key, value, ttl);
    return value;
  }
} 