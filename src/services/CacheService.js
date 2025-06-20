/**
 * Сервис кэширования
 * Поддерживает как in-memory кэш, так и Redis
 */
class CacheService {
  constructor() {
    this.inMemoryCache = new Map();
    this.redis = null;
    this.isRedisAvailable = false;
    
    this._initializeRedis();
  }

  /**
   * Инициализация Redis (опционально)
   */
  async _initializeRedis() {
    try {
      if (process.env.REDIS_URL || process.env.REDIS_HOST) {
        const redis = require('redis');
        
        const redisConfig = {
          url: process.env.REDIS_URL,
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3
        };

        this.redis = redis.createClient(redisConfig);
        
        this.redis.on('error', (err) => {
          console.warn('Redis недоступен, используется in-memory кэш:', err.message);
          this.isRedisAvailable = false;
        });

        this.redis.on('connect', () => {
          // // console.log('✅ Redis подключен для кэширования');
          this.isRedisAvailable = true;
        });

        await this.redis.connect();
      }
    } catch (error) {
      console.warn('Redis недоступен, используется in-memory кэш:', error.message);
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
      if (this.isRedisAvailable && this.redis) {
        const value = await this.redis.get(key);
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
      console.error('Ошибка получения из кэша:', error);
      return null;
    }
  }

  /**
   * Сохранение значения в кэш
   * @param {string} key - Ключ
   * @param {any} value - Значение
   * @param {number} ttl - Время жизни в секундах (по умолчанию 300)
   */
  async set(key, value, ttl = 300) {
    try {
      if (this.isRedisAvailable && this.redis) {
        await this.redis.setEx(key, ttl, JSON.stringify(value));
      } else {
        // Fallback к in-memory кэшу
        this.inMemoryCache.set(key, {
          value,
          expires: Date.now() + (ttl * 1000)
        });
        
        // Очистка истекших записей
        this._cleanupInMemoryCache();
      }
    } catch (error) {
      console.error('Ошибка сохранения в кэш:', error);
    }
  }

  /**
   * Удаление из кэша
   * @param {string} key - Ключ
   */
  async del(key) {
    try {
      if (this.isRedisAvailable && this.redis) {
        await this.redis.del(key);
      } else {
        this.inMemoryCache.delete(key);
      }
    } catch (error) {
      console.error('Ошибка удаления из кэша:', error);
    }
  }

  /**
   * Очистка всего кэша
   */
  async clear() {
    try {
      if (this.isRedisAvailable && this.redis) {
        await this.redis.flushDb();
      } else {
        this.inMemoryCache.clear();
      }
    } catch (error) {
      console.error('Ошибка очистки кэша:', error);
    }
  }

  /**
   * Получение или установка значения (паттерн cache-aside)
   * @param {string} key - Ключ
   * @param {Function} fetchFunction - Функция для получения данных
   * @param {number} ttl - Время жизни в секундах
   * @returns {Promise<any>}
   */
  async getOrSet(key, fetchFunction, ttl = 300) {
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
  memoize(prefix, fn, ttl = 300) {
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
      if (this.isRedisAvailable && this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(keys);
        }
      } else {
        // Для in-memory кэша используем простой поиск
        const regex = new RegExp(pattern.replace('*', '.*'));
        for (const key of this.inMemoryCache.keys()) {
          if (regex.test(key)) {
            this.inMemoryCache.delete(key);
          }
        }
      }
    } catch (error) {
      console.error('Ошибка инвалидации кэша:', error);
    }
  }

  /**
   * Статистика кэша
   */
  async getStats() {
    try {
      if (this.isRedisAvailable && this.redis) {
        const info = await this.redis.info('memory');
        return {
          type: 'redis',
          available: true,
          info: info
        };
      } else {
        return {
          type: 'memory',
          available: true,
          size: this.inMemoryCache.size,
          keys: Array.from(this.inMemoryCache.keys())
        };
      }
    } catch (error) {
      return {
        type: 'unknown',
        available: false,
        error: error.message
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
      if (this.redis) {
        await this.redis.quit();
      }
      this.inMemoryCache.clear();
    } catch (error) {
      console.error('Ошибка закрытия кэша:', error);
    }
  }
}

module.exports = new CacheService(); 