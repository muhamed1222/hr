import { Request, Response, NextFunction } from 'express';
import { CacheManager } from '../services/cache/CacheManager';
import { AppError } from '../services/errors/AppError';
import logger from '../config/logging';

export class UserController {
  constructor(private cacheManager: CacheManager) {}

  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly USERS_CACHE_KEY = 'users:list';

  getUserCacheKey(userId: string): string {
    return `user:${userId}`;
  }

  getUsers = (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    return (async () => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const cacheKey = `${this.USERS_CACHE_KEY}:${page}:${limit}`;

        const users = await this.cacheManager.remember(
          cacheKey,
          this.CACHE_TTL,
          async () => {
            logger.info('Cache miss for users list, fetching from database');
            // Здесь будет реальный запрос к базе данных
            return {
              items: [],
              total: 0,
              page,
              pageSize: limit,
            };
          }
        );

        res.json(users);
      } catch (error) {
        next(error);
      }
    })();
  };

  getUser = (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    return (async () => {
      try {
        const { id } = req.params;
        if (!id) {
          throw AppError.ValidationError('User ID is required');
        }

        const cacheKey = this.getUserCacheKey(id);
        const user = await this.cacheManager.remember(
          cacheKey,
          this.CACHE_TTL,
          async () => {
            logger.info(`Cache miss for user ${id}, fetching from database`);
            // Здесь будет реальный запрос к базе данных
            return null;
          }
        );

        if (!user) {
          throw AppError.ValidationError('User not found');
        }

        res.json(user);
      } catch (error) {
        next(error);
      }
    })();
  };

  createUser = (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    return (async () => {
      try {
        const { email, firstName, lastName } = req.body;

        if (!email) {
          throw AppError.ValidationError('Email is required');
        }

        // Здесь будет создание пользователя в базе данных
        const user = { id: '1', email, firstName, lastName };

        // Очищаем кэш списка пользователей
        await this.cacheManager.clear(this.USERS_CACHE_KEY);

        res.status(201).json(user);
      } catch (error) {
        next(error);
      }
    })();
  };

  updateUser = (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    return (async () => {
      try {
        const { id } = req.params;
        const { email, firstName, lastName } = req.body;

        if (!id) {
          throw AppError.ValidationError('User ID is required');
        }

        // Здесь будет обновление пользователя в базе данных
        const user = { id, email, firstName, lastName };

        // Очищаем кэш пользователя и списка
        await Promise.all([
          this.cacheManager.delete(this.getUserCacheKey(id)),
          this.cacheManager.clear(this.USERS_CACHE_KEY),
        ]);

        res.json(user);
      } catch (error) {
        next(error);
      }
    })();
  };
} 