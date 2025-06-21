import { Redis } from 'ioredis';
import logger from '../config/logging';
import redisClient from '../config/redis';
import { LIMITS } from '../constants';

export class SecurityMonitoringService {
  private readonly redis: Redis;
  private readonly memoryStore: Map<string, any>;

  constructor() {
    this.redis = redisClient;
    this.memoryStore = new Map();
  }

  async recordLoginAttempt(userId: string, ip: string, success: boolean): Promise<void> {
    try {
      const key = `login:attempts:${userId}:${ip}`;
      const attempts = await this.redis.incr(key);
      await this.redis.expire(key, LIMITS.LOGIN_BLOCK_DURATION);

      if (attempts >= LIMITS.MAX_LOGIN_ATTEMPTS) {
        await this.blockUser(userId, ip);
      }
    } catch (error) {
      logger.error('Error recording login attempt:', error);
    }
  }

  async isUserBlocked(userId: string, ip: string): Promise<boolean> {
    try {
      const userKey = `blocked:user:${userId}`;
      const ipKey = `blocked:ip:${ip}`;

      const [userBlocked, ipBlocked] = await Promise.all([
        this.redis.exists(userKey),
        this.redis.exists(ipKey)
      ]);

      return userBlocked === 1 || ipBlocked === 1;
    } catch (error) {
      logger.error('Error checking user block status:', error);
      return false;
    }
  }

  private async blockUser(userId: string, ip: string): Promise<void> {
    try {
      const userKey = `blocked:user:${userId}`;
      const ipKey = `blocked:ip:${ip}`;

      await Promise.all([
        this.redis.set(userKey, '1', 'EX', LIMITS.LOGIN_BLOCK_DURATION),
        this.redis.set(ipKey, '1', 'EX', LIMITS.IP_BLOCK_DURATION)
      ]);

      logger.warn(`User ${userId} blocked for ${LIMITS.LOGIN_BLOCK_DURATION} seconds`);
    } catch (error) {
      logger.error('Error blocking user:', error);
    }
  }

  async recordSuspiciousActivity(userId: string, ip: string, type: string): Promise<void> {
    try {
      const key = `suspicious:${type}:${userId}:${ip}`;
      await this.redis.incr(key);
      await this.redis.expire(key, LIMITS.IP_BLOCK_DURATION);
    } catch (error) {
      logger.error('Error recording suspicious activity:', error);
    }
  }
} 