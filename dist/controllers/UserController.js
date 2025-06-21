"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const AppError_1 = require("../services/errors/AppError");
const logging_1 = __importDefault(require("../config/logging"));
class UserController {
    constructor(cacheManager) {
        this.cacheManager = cacheManager;
        this.CACHE_TTL = 300; // 5 minutes
        this.USERS_CACHE_KEY = 'users:list';
        this.getUsers = (req, res, next) => {
            return (async () => {
                try {
                    const page = parseInt(req.query.page) || 1;
                    const limit = parseInt(req.query.limit) || 10;
                    const cacheKey = `${this.USERS_CACHE_KEY}:${page}:${limit}`;
                    const users = await this.cacheManager.remember(cacheKey, this.CACHE_TTL, async () => {
                        logging_1.default.info('Cache miss for users list, fetching from database');
                        // Здесь будет реальный запрос к базе данных
                        return {
                            items: [],
                            total: 0,
                            page,
                            pageSize: limit,
                        };
                    });
                    res.json(users);
                }
                catch (error) {
                    next(error);
                }
            })();
        };
        this.getUser = (req, res, next) => {
            return (async () => {
                try {
                    const { id } = req.params;
                    if (!id) {
                        throw AppError_1.AppError.ValidationError('User ID is required');
                    }
                    const cacheKey = this.getUserCacheKey(id);
                    const user = await this.cacheManager.remember(cacheKey, this.CACHE_TTL, async () => {
                        logging_1.default.info(`Cache miss for user ${id}, fetching from database`);
                        // Здесь будет реальный запрос к базе данных
                        return null;
                    });
                    if (!user) {
                        throw AppError_1.AppError.ValidationError('User not found');
                    }
                    res.json(user);
                }
                catch (error) {
                    next(error);
                }
            })();
        };
        this.createUser = (req, res, next) => {
            return (async () => {
                try {
                    const { email, firstName, lastName } = req.body;
                    if (!email) {
                        throw AppError_1.AppError.ValidationError('Email is required');
                    }
                    // Здесь будет создание пользователя в базе данных
                    const user = { id: '1', email, firstName, lastName };
                    // Очищаем кэш списка пользователей
                    await this.cacheManager.clear(this.USERS_CACHE_KEY);
                    res.status(201).json(user);
                }
                catch (error) {
                    next(error);
                }
            })();
        };
        this.updateUser = (req, res, next) => {
            return (async () => {
                try {
                    const { id } = req.params;
                    const { email, firstName, lastName } = req.body;
                    if (!id) {
                        throw AppError_1.AppError.ValidationError('User ID is required');
                    }
                    // Здесь будет обновление пользователя в базе данных
                    const user = { id, email, firstName, lastName };
                    // Очищаем кэш пользователя и списка
                    await Promise.all([
                        this.cacheManager.delete(this.getUserCacheKey(id)),
                        this.cacheManager.clear(this.USERS_CACHE_KEY),
                    ]);
                    res.json(user);
                }
                catch (error) {
                    next(error);
                }
            })();
        };
    }
    getUserCacheKey(userId) {
        return `user:${userId}`;
    }
}
exports.UserController = UserController;
