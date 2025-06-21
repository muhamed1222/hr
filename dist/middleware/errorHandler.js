"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const AppError_1 = require("../services/errors/AppError");
const logging_1 = __importDefault(require("../config/logging"));
const errorHandler = (err, req, res, next) => {
    logging_1.default.error(err);
    if (err instanceof AppError_1.AppError) {
        return res.status(err.statusCode).json({
            message: err.message,
            isOperational: err.isOperational,
        });
    }
    // Непредвиденная ошибка
    return res.status(500).json({
        message: 'Внутренняя ошибка сервера',
        isOperational: false,
    });
};
exports.errorHandler = errorHandler;
// Catch unhandled rejections and exceptions
process.on('unhandledRejection', (reason) => {
    logging_1.default.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (error) => {
    logging_1.default.error('Uncaught Exception:', error);
    process.exit(1);
});
