import { Redis } from 'ioredis';
import { logger } from '../../config/logging';

export interface CacheOptions {
  ttl?: number;
  prefix?: string;
}

export class CacheManager {
  private readonly redis: Redis;
  private readonly defaultTTL: number = 3600; // 1 hour in seconds
  private readonly prefix: string;

  constructor(redis: Redis, options: CacheOptions = {}) {
    this.redis = redis;
    this.prefix = options.prefix || 'cache:';
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(this.getKey(key));
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      logger.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    ttl: number = this.defaultTTL
  ): Promise<boolean> {
    try {
      const data = JSON.stringify(value);
      await this.redis.set(this.getKey(key), data, 'EX', ttl);
      return true;
    } catch (error) {
      logger.error(`Error setting cache key ${key}:`, error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(this.getKey(key));
      return result === 1;
    } catch (error) {
      logger.error(`Error deleting cache key ${key}:`, error);
      return false;
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const exists = await this.redis.exists(this.getKey(key));
      return exists === 1;
    } catch (error) {
      logger.error(`Error checking cache key ${key}:`, error);
      return false;
    }
  }

  async clear(pattern?: string): Promise<void> {
    try {
      const searchPattern = pattern
        ? this.getKey(pattern)
        : `${this.prefix}*`;
      
      const keys = await this.redis.keys(searchPattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      logger.error('Error clearing cache:', error);
    }
  }

  // Метод для кэширования результатов функции
  async remember<T>(
    key: string,
    ttl: number,
    callback: () => Promise<T>
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await callback();
    await this.set(key, fresh, ttl);
    return fresh;
  }
} 