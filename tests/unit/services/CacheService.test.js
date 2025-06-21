const CacheService = require('../../../src/services/CacheService');
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

  describe('get', () => {
    it('должен возвращать данные из кэша', async () => {
      const mockData = JSON.stringify({ key: 'value' });
      mockRedisClient.get.mockResolvedValue(mockData);

      const result = await cacheService.get('test-key');

      expect(result).toEqual({ key: 'value' });
      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
    });

    it('должен возвращать null если данных нет в кэше', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('должен сохранять данные в кэш с TTL', async () => {
      const data = { key: 'value' };
      const ttl = 3600;

      await cacheService.set('test-key', data, ttl);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'test-key',
        ttl,
        JSON.stringify(data)
      );
    });

    it('должен сохранять данные в кэш без TTL', async () => {
      const data = { key: 'value' };

      await cacheService.set('test-key', data);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(data)
      );
    });
  });

  describe('delete', () => {
    it('должен удалять данные из кэша', async () => {
      await cacheService.delete('test-key');

      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
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