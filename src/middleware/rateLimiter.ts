import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Redis } from 'ioredis';
import { AppError } from '../services/errors/AppError';

const redis = new Redis(process.env.REDIS_URL);

export const createRateLimiter = (
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  max: number = 100 // limit each IP to 100 requests per windowMs
) => {
  return rateLimit({
    store: new RedisStore({
      client: redis,
      prefix: 'rate-limit:',
    }),
    windowMs,
    max,
    handler: (req, res) => {
      throw new AppError(
        429,
        'Too many requests, please try again later.',
        'RATE_LIMIT_ERROR'
      );
    },
  });
};

// Different rate limiters for different routes
export const authLimiter = createRateLimiter(15 * 60 * 1000, 5); // 5 requests per 15 minutes
export const apiLimiter = createRateLimiter(60 * 1000, 60); // 60 requests per minute 