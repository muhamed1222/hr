import Redis from 'ioredis';
import logger from '../config/logging';

class CacheService {
  private client: Redis;
  private readonly maxReconnectAttempts: number = 5;
  private readonly reconnectDelay: number = 5000;
  private reconnectAttempts: number = 0;

  constructor() {
    this.client = this.createClient();
  }

  private createClient(): Redis {
    const client = new Redis(process.env.REDIS_URL);

    client.on('error', (error: Error) => {
      logger.error('Redis connection error:', { error: error.message });
      this.handleConnectionError();
    });

    client.on('connect', () => {
      logger.info('Connected to Redis');
      this.reconnectAttempts = 0;
    });

    return client;
  }

  private async handleConnectionError(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    logger.info(`Attempting to reconnect to Redis (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.client = this.createClient();
    }, this.reconnectDelay);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Error getting data from cache:', { error, key });
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
    } catch (error) {
      logger.error('Error setting data in cache:', { error, key });
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Error deleting data from cache:', { error, key });
    }
  }

  async clear(): Promise<void> {
    try {
      await this.client.flushall();
    } catch (error) {
      logger.error('Error clearing cache:', { error });
    }
  }
}

export const cacheService = new CacheService(); 