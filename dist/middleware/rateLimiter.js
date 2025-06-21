"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = exports.apiLimiter = exports.authLimiter = exports.createRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const AppError_1 = require("../services/errors/AppError");
const createRateLimiter = (windowMs = 15 * 60 * 1000, // 15 minutes
max = 100 // limit each IP to 100 requests per windowMs
) => {
    return (0, express_rate_limit_1.default)({
        windowMs,
        max,
        handler: (req, res) => {
            throw new AppError_1.AppError(429, 'Too many requests, please try again later.', 'RATE_LIMIT_ERROR');
        },
    });
};
exports.createRateLimiter = createRateLimiter;
// Different rate limiters for different routes
exports.authLimiter = (0, exports.createRateLimiter)(15 * 60 * 1000, 5); // 5 requests per 15 minutes
exports.apiLimiter = (0, exports.createRateLimiter)(60 * 1000, 60); // 60 requests per minute
exports.rateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later',
    handler: (req, res) => {
        throw new AppError_1.AppError('Too many requests from this IP, please try again later', 429);
    },
});
