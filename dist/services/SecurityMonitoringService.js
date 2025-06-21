"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityMonitoringService = void 0;
const logging_1 = __importDefault(require("../config/logging"));
const redis_1 = __importDefault(require("../config/redis"));
const constants_1 = require("../constants");
class SecurityMonitoringService {
    constructor() {
        this.redis = redis_1.default;
        this.memoryStore = new Map();
    }
    async recordLoginAttempt(userId, ip, success) {
        try {
            const key = `login:attempts:${userId}:${ip}`;
            const attempts = await this.redis.incr(key);
            await this.redis.expire(key, constants_1.LIMITS.LOGIN_BLOCK_DURATION);
            if (attempts >= constants_1.LIMITS.MAX_LOGIN_ATTEMPTS) {
                await this.blockUser(userId, ip);
            }
        }
        catch (error) {
            logging_1.default.error('Error recording login attempt:', error);
        }
    }
    async isUserBlocked(userId, ip) {
        try {
            const userKey = `blocked:user:${userId}`;
            const ipKey = `blocked:ip:${ip}`;
            const [userBlocked, ipBlocked] = await Promise.all([
                this.redis.exists(userKey),
                this.redis.exists(ipKey)
            ]);
            return userBlocked === 1 || ipBlocked === 1;
        }
        catch (error) {
            logging_1.default.error('Error checking user block status:', error);
            return false;
        }
    }
    async blockUser(userId, ip) {
        try {
            const userKey = `blocked:user:${userId}`;
            const ipKey = `blocked:ip:${ip}`;
            await Promise.all([
                this.redis.set(userKey, '1', 'EX', constants_1.LIMITS.LOGIN_BLOCK_DURATION),
                this.redis.set(ipKey, '1', 'EX', constants_1.LIMITS.IP_BLOCK_DURATION)
            ]);
            logging_1.default.warn(`User ${userId} blocked for ${constants_1.LIMITS.LOGIN_BLOCK_DURATION} seconds`);
        }
        catch (error) {
            logging_1.default.error('Error blocking user:', error);
        }
    }
    async recordSuspiciousActivity(userId, ip, type) {
        try {
            const key = `suspicious:${type}:${userId}:${ip}`;
            await this.redis.incr(key);
            await this.redis.expire(key, constants_1.LIMITS.IP_BLOCK_DURATION);
        }
        catch (error) {
            logging_1.default.error('Error recording suspicious activity:', error);
        }
    }
}
exports.SecurityMonitoringService = SecurityMonitoringService;
