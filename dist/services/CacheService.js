"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class CacheService {
    constructor() {
        this.memoryCache = new Map();
    }
    static getInstance() {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService();
        }
        return CacheService.instance;
    }
    async get(key) {
        return this.memoryCache.get(key);
    }
    async set(key, value, ttl) {
        this.memoryCache.set(key, value);
        if (ttl) {
            setTimeout(() => {
                this.memoryCache.delete(key);
            }, ttl * 1000);
        }
    }
    async del(key) {
        this.memoryCache.delete(key);
    }
    async clear() {
        this.memoryCache.clear();
    }
}
exports.default = CacheService.getInstance();
