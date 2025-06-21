"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
const logging_1 = __importDefault(require("../../config/logging"));
const redis_1 = __importDefault(require("../../config/redis"));
class CacheManager {
    constructor(options = {}) {
        this.prefix = options.prefix || 'cache:';
        this.defaultTTL = options.defaultTTL || 3600; // 1 hour
        this.redis = redis_1.default;
    }
    getKey(key) {
        return `${this.prefix}${key}`;
    }
    async get(key) {
        try {
            const value = await this.redis.get(this.getKey(key));
            return value ? JSON.parse(value) : null;
        }
        catch (error) {
            logging_1.default.error('Cache get error:', error);
            return null;
        }
    }
    async set(key, value, ttl) {
        try {
            const serializedValue = JSON.stringify(value);
            if (ttl) {
                await this.redis.setex(this.getKey(key), ttl, serializedValue);
            }
            else {
                await this.redis.set(this.getKey(key), serializedValue);
            }
        }
        catch (error) {
            logging_1.default.error('Cache set error:', error);
        }
    }
    async delete(key) {
        try {
            await this.redis.del(this.getKey(key));
        }
        catch (error) {
            logging_1.default.error('Cache delete error:', error);
        }
    }
    async clear(pattern) {
        try {
            const searchPattern = pattern ? `${this.prefix}${pattern}*` : `${this.prefix}*`;
            const keys = await this.redis.keys(searchPattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
        }
        catch (error) {
            logging_1.default.error('Cache clear error:', error);
        }
    }
    async remember(key, ttl, callback) {
        const cachedValue = await this.get(key);
        if (cachedValue !== null) {
            return cachedValue;
        }
        const value = await callback();
        await this.set(key, value, ttl);
        return value;
    }
}
exports.CacheManager = CacheManager;
