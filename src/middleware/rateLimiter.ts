import rateLimit from 'express-rate-limit';
import { AppError } from '../services/errors/AppError';
import { LIMITS } from '../constants';

export const createRateLimiter = (
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  max: number = 100 // limit each IP to 100 requests per windowMs
) => {
  return rateLimit({
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

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  handler: (req, res) => {
    throw new AppError('Too many requests from this IP, please try again later', 429);
  },
}); 