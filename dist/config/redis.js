"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
const logging_1 = __importDefault(require("./logging"));
// Создаем мок-клиент Redis для тестирования
const mockRedisClient = {
    get: async () => null,
    set: async () => 'OK',
    setex: async () => 'OK',
    del: async () => 1,
    keys: async () => [],
    incr: async () => 1,
    expire: async () => 1,
    exists: async () => 0,
};
const shouldUseMock = process.env.NODE_ENV !== 'production';
const redisClient = shouldUseMock ? mockRedisClient : new ioredis_1.default({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
        return Math.min(times * 50, 2000);
    }
});
if (!shouldUseMock) {
    redisClient.on('error', (error) => {
        logging_1.default.error('Redis error:', error);
    });
    redisClient.on('connect', () => {
        logging_1.default.info('Redis connected successfully');
    });
}
exports.default = redisClient;
