import Redis from 'ioredis';
import logger from './logging';

// Создаем мок-клиент Redis для тестирования
const mockRedisClient = {
  get: async () => null,
  set: async () => 'OK',
  setex: async () => 'OK',
  del: async () => 1,
  keys: async () => [],
  incr: async () => 1,
  expire: async () => 1,
  exists: async () => 0,
};

const shouldUseMock = process.env.NODE_ENV !== 'production';

const redisClient = shouldUseMock ? (mockRedisClient as any) : new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    return Math.min(times * 50, 2000);
  }
});

if (!shouldUseMock) {
  redisClient.on('error', (error: Error) => {
    logger.error('Redis error:', error);
  });

  redisClient.on('connect', () => {
    logger.info('Redis connected successfully');
  });
}

export default redisClient; 