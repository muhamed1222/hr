const { CacheService } = require('../../../src/services/CacheService');
const Redis = require('ioredis');

// Мокаем Redis
jest.mock('ioredis');

describe('CacheService', () => {
  let cacheService;
  let mockRedisClient;

  beforeEach(() => {
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      setex: jest.fn()
    };

    Redis.mockImplementation(() => mockRedisClient);
    cacheService = new CacheService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('set and get', () => {
    it('should store and retrieve a value', async () => {
      // Arrange
      const key = 'testKey';
      const value = { data: 'testValue' };

      // Act
      await cacheService.set(key, value);
      const result = await cacheService.get(key);

      // Assert
      expect(result).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      // Act
      const result = await cacheService.get('nonExistentKey');

      // Assert
      expect(result).toBeNull();
    });

    it('should respect TTL and expire items', async () => {
      // Arrange
      const key = 'expiringKey';
      const value = 'expiringValue';
      const ttl = 1; // 1 second

      // Act
      await cacheService.set(key, value, ttl);
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const result = await cacheService.get(key);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete an existing key', async () => {
      // Arrange
      const key = 'deleteKey';
      const value = 'deleteValue';
      await cacheService.set(key, value);

      // Act
      await cacheService.delete(key);
      const result = await cacheService.get(key);

      // Assert
      expect(result).toBeNull();
    });

    it('should not throw error when deleting non-existent key', async () => {
      // Act & Assert
      await expect(cacheService.delete('nonExistentKey')).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('should remove all cached items', async () => {
      // Arrange
      await cacheService.set('key1', 'value1');
      await cacheService.set('key2', 'value2');

      // Act
      await cacheService.clear();

      // Assert
      const result1 = await cacheService.get('key1');
      const result2 = await cacheService.get('key2');
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      // Arrange
      const key = 'cachedKey';
      const value = 'cachedValue';
      await cacheService.set(key, value);
      const fetchFn = jest.fn();

      // Act
      const result = await cacheService.getOrSet(key, fetchFn);

      // Assert
      expect(result).toBe(value);
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('should fetch and cache value if not exists', async () => {
      // Arrange
      const key = 'newKey';
      const value = 'newValue';
      const fetchFn = jest.fn().mockResolvedValue(value);

      // Act
      const result = await cacheService.getOrSet(key, fetchFn);
      const cachedValue = await cacheService.get(key);

      // Assert
      expect(result).toBe(value);
      expect(cachedValue).toBe(value);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch function errors', async () => {
      // Arrange
      const key = 'errorKey';
      const error = new Error('Fetch failed');
      const fetchFn = jest.fn().mockRejectedValue(error);

      // Act & Assert
      await expect(cacheService.getOrSet(key, fetchFn)).rejects.toThrow(error);
      const cachedValue = await cacheService.get(key);
      expect(cachedValue).toBeNull();
    });
  });

  describe('reconnection', () => {
    it('должен пытаться переподключиться при ошибке соединения', async () => {
      const error = new Error('Connection lost');
      mockRedisClient.get.mockRejectedValue(error);

      await expect(cacheService.get('test-key')).rejects.toThrow();
      // Проверяем, что была попытка переподключения
      expect(Redis).toHaveBeenCalledTimes(2);
    });
  });
}); 