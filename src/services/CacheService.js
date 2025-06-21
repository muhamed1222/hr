"use strict";

const { _info, _warn, _error } = require('../config/logging');

/**
 * Сервис кэширования
 * Поддерживает только in-memory кэш
 */
class CacheService {
  constructor() {
    this.memoryCache = new Map();
  }

  /**
   * Получение значения из кэша
   * @param {string} key - Ключ
   * @returns {Promise<any>} Значение
   */
  async get(key) {
    const value = this.memoryCache.get(key);
    if (value && value.expires > Date.now()) {
      return value.data;
    } else if (value) {
      this.memoryCache.delete(key);
    }
    return null;
  }

  /**
   * Сохранение значения в кэш
   * @param {string} key - Ключ
   * @param {any} value - Значение
   * @param {number} ttl - Время жизни в секундах
   */
  async set(key, value, ttl = 3600) {
    this.memoryCache.set(key, {
      data: value,
      expires: Date.now() + (ttl * 1000)
    });
  }

  /**
   * Удаление значения из кэша
   * @param {string} key - Ключ
   */
  async del(key) {
    this.memoryCache.delete(key);
  }

  /**
   * Очистка всего кэша
   */
  async clear() {
    this.memoryCache.clear();
  }

  /**
   * Очистка кэша по шаблону
   * @param {string} pattern - Шаблон ключей для очистки
   */
  async clearPattern(pattern) {
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Получение статистики кэша
   * @returns {Promise<object>} Статистика
   */
  async getStats() {
    return {
      type: "memory",
      size: this.memoryCache.size,
      keys: Array.from(this.memoryCache.keys()),
      memory: process.memoryUsage().heapUsed
    };
  }

  /**
   * Закрытие соединений
   */
  async close() {
    this.memoryCache.clear();
  }

  /**
   * Очистка API кэша
   * @param {string} prefix - Префикс ключей для очистки
   */
  async clearApiCache(prefix = '') {
    try {
      for (const key of this.memoryCache.keys()) {
        if (key.startsWith(`api:${prefix}`)) {
          this.memoryCache.delete(key);
        }
      }
      return true;
    } catch (error) {
      _error('Error clearing API cache:', error);
      return false;
    }
  }

  /**
   * Middleware для кэширования
   * @param {string} prefix - Префикс для ключа кэша
   * @param {number} ttl - Время жизни кэша в секундах
   */
  cacheMiddleware(prefix, ttl = 3600) {
    return async (req, res, next) => {
      const key = `api:${prefix}:${req.originalUrl}`;
      try {
        const cachedData = await this.get(key);
        if (cachedData) {
          return res.json(cachedData);
        }
        
        // Сохраняем оригинальный метод json
        const originalJson = res.json.bind(res);
        
        // Переопределяем метод json для перехвата ответа
        res.json = (data) => {
          if (res.statusCode === 200) {
            this.set(key, data, ttl).catch(err => _error('Cache set error:', err));
          }
          return originalJson(data);
        };
        
        next();
      } catch (error) {
        _error('Cache middleware error:', error);
        next();
      }
    };
  }

  /**
   * Инвалидация кэша
   * @param {string} prefix - Префикс для инвалидации
   */
  invalidateCache(prefix) {
    return this.clearPattern(`api:${prefix}`);
  }
}

const cacheService = new CacheService();
module.exports = cacheService;
