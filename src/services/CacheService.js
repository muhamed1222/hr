"use strict";

const { createClient } = require('redis');
const { error: _error, info: _info, warn: _warn, debug: _debug } = require("../utils/logger");

/**
 * Сервис кэширования
 * Поддерживает как in-memory кэш, так и Redis
 */
class CacheService {
  constructor() {
    this.inMemoryCache = new Map();
    this.redisClient = null;
    this.isRedisAvailable = false;
    this.defaultTTL = 3600; // 1 час по умолчанию

    this.initRedis();
  }

  /**
   * Инициализация Redis (опционально)
   */
  async initRedis() {
    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      this.redisClient.on('error', (error) => {
        _warn('Redis cache error:', error);
        this.isRedisAvailable = false;
      });

      this.redisClient.on("connect", () => {
        _info('Redis connected for API caching');
        this.isRedisAvailable = true;
      });

      await this.redisClient.connect();
    } catch (error) {
      _warn('Redis cache connection failed:', error);
      this.isRedisAvailable = false;
    }
  }

  /**
   * Получение значения из кэша
   * @param {string} key - Ключ
   * @returns {Promise<any>} - Значение или null
   */
  async get(key) {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        const value = await this.redisClient.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        // Fallback к in-memory кэшу
        const cached = this.inMemoryCache.get(key);
        if (cached && cached.expires > Date.now()) {
          return cached.value;
        } else if (cached) {
          this.inMemoryCache.delete(key);
        }
        return null;
      }
    } catch (error) {
      _error("Ошибка получения из кэша:", error);
      return null;
    }
  }

  /**
   * Сохранение значения в кэш
   * @param {string} key - Ключ
   * @param {any} value - Значение
   * @param {number} ttl - Время жизни в секундах (по умолчанию 300)
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        await this.redisClient.set(key, JSON.stringify(value), { EX: ttl });
      } else {
        // Fallback к in-memory кэшу
        this.inMemoryCache.set(key, {
          value,
          expires: Date.now() + ttl * LIMITS.MAX_PAGE_SIZE0,
        });

        // Очистка истекших записей
        this._cleanupInMemoryCache();
      }
      return true;
    } catch (error) {
      _error("Ошибка сохранения в кэш:", error);
      return false;
    }
  }

  /**
   * Удаление из кэша
   * @param {string} key - Ключ
   */
  async del(key) {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        await this.redisClient.del(key);
      } else {
        this.inMemoryCache.delete(key);
      }
      return true;
    } catch (error) {
      _error("Ошибка удаления из кэша:", error);
      return false;
    }
  }

  /**
   * Очистка всего кэша
   */
  async clear() {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        await this.redisClient.flushDb();
      } else {
        this.inMemoryCache.clear();
      }
    } catch (error) {
      _error("Ошибка очистки кэша:", error);
    }
  }

  /**
   * Получение или установка значения (паттерн cache-aside)
   * @param {string} key - Ключ
   * @param {Function} fetchFunction - Функция для получения данных
   * @param {number} ttl - Время жизни в секундах
   * @returns {Promise<any>}
   */
  async getOrSet(key, fetchFunction, ttl = this.defaultTTL) {
    let value = await this.get(key);

    if (value === null) {
      value = await fetchFunction();
      if (value !== null && value !== undefined) {
        await this.set(key, value, ttl);
      }
    }

    return value;
  }

  /**
   * Кэширование результатов функции
   * @param {string} prefix - Префикс ключа
   * @param {Function} fn - Функция для кэширования
   * @param {number} ttl - Время жизни в секундах
   * @returns {Function} - Обёрнутая функция
   */
  memoize(prefix, fn, ttl = this.defaultTTL) {
    return async (...args) => {
      const key = `${prefix}:${JSON.stringify(args)}`;
      return await this.getOrSet(key, () => fn(...args), ttl);
    };
  }

  /**
   * Инвалидация кэша по паттерну
   * @param {string} pattern - Паттерн ключей
   */
  async invalidatePattern(pattern) {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
      } else {
        // Для in-memory кэша используем простой поиск
        const regex = new RegExp(pattern.replace("*", ".*"));
        for (const key of this.inMemoryCache.keys()) {
          if (regex.test(key)) {
            this.inMemoryCache.delete(key);
          }
        }
      }
    } catch (error) {
      _error("Ошибка инвалидации кэша:", error);
    }
  }

  /**
   * Статистика кэша
   */
  async getStats() {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        const info = await this.redisClient.info("memory");
        return {
          type: "redis",
          available: true,
          info: info,
        };
      } else {
        return {
          type: "memory",
          available: true,
          size: this.inMemoryCache.size,
          keys: Array.from(this.inMemoryCache.keys()),
        };
      }
    } catch (error) {
      return {
        type: "unknown",
        available: false,
        error: error.message,
      };
    }
  }

  /**
   * Очистка истекших записей in-memory кэша
   * @private
   */
  _cleanupInMemoryCache() {
    const now = Date.now();
    for (const [key, cached] of this.inMemoryCache.entries()) {
      if (cached.expires <= now) {
        this.inMemoryCache.delete(key);
      }
    }
  }

  /**
   * Закрытие соединений
   */
  async close() {
    try {
      if (this.redisClient) {
        await this.redisClient.quit();
      }
      this.inMemoryCache.clear();
    } catch (error) {
      _error("Ошибка закрытия кэша:", error);
    }
  }

  // Генерация ключа кэша
  generateKey(prefix, params) {
    const normalizedParams = typeof params === 'string' ? params : JSON.stringify(params);
    return `api:${prefix}:${normalizedParams}`;
  }

  // Очистка кэша по префиксу
  async clearByPrefix(prefix) {
    try {
      const keys = await this.redisClient.keys(`api:${prefix}:*`);
      if (keys.length > 0) {
        await this.redisClient.del(keys);
      }
      return true;
    } catch (error) {
      _error('Cache clear error:', error);
      return false;
    }
  }

  // Middleware для кэширования API ответов
  cacheMiddleware(prefix, ttl = null) {
    return async (req, res, next) => {
      if (req.method !== 'GET') {
        return next();
      }

      const cacheKey = this.generateKey(prefix, {
        path: req.path,
        query: req.query,
        user: req.user?.id
      });

      try {
        const cachedData = await this.get(cacheKey);
        if (cachedData) {
          return res.json(cachedData);
        }

        // Перехватываем оригинальный res.json
        const originalJson = res.json.bind(res);
        res.json = async (data) => {
          await this.set(cacheKey, data, ttl || this.defaultTTL);
          return originalJson(data);
        };

        next();
      } catch (error) {
        _error('Cache middleware error:', error);
        next();
      }
    };
  }

  // Middleware для инвалидации кэша
  invalidateCache(prefix) {
    return async (req, res, next) => {
      const originalJson = res.json.bind(res);
      res.json = async (data) => {
        await this.clearByPrefix(prefix);
        return originalJson(data);
      };
      next();
    };
  }
}

module.exports = new CacheService();
