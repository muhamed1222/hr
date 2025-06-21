import logger from '../config/logging';

class CacheService {
  private static instance: CacheService;
  private memoryCache: Map<string, any>;

  private constructor() {
    this.memoryCache = new Map();
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  public async get(key: string): Promise<any> {
    return this.memoryCache.get(key);
  }

  public async set(key: string, value: any, ttl?: number): Promise<void> {
    this.memoryCache.set(key, value);
    if (ttl) {
      setTimeout(() => {
        this.memoryCache.delete(key);
      }, ttl * 1000);
    }
  }

  public async del(key: string): Promise<void> {
    this.memoryCache.delete(key);
  }

  public async clear(): Promise<void> {
    this.memoryCache.clear();
  }
}

export default CacheService.getInstance(); 