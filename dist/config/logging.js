"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logSecurityEvent = exports.errorLogger = exports.requestLogger = exports.securityLogger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
require("winston-daily-rotate-file");
const LOG_DIR = path_1.default.join(__dirname, '../../logs');
const MAX_SIZE = '20m';
const MAX_FILES = '14d';
const customFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.splat(), winston_1.default.format.json());
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
        msg += '\n' + JSON.stringify(metadata, null, 2);
    }
    return msg;
}));
const errorFileTransport = new winston_1.default.transports.DailyRotateFile({
    filename: path_1.default.join(LOG_DIR, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: MAX_SIZE,
    maxFiles: MAX_FILES,
    level: 'error',
    format: customFormat
});
const combinedFileTransport = new winston_1.default.transports.DailyRotateFile({
    filename: path_1.default.join(LOG_DIR, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: MAX_SIZE,
    maxFiles: MAX_FILES,
    format: customFormat
});
const securityFileTransport = new winston_1.default.transports.DailyRotateFile({
    filename: path_1.default.join(LOG_DIR, 'security-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: MAX_SIZE,
    maxFiles: MAX_FILES,
    format: customFormat
});
const consoleTransport = new winston_1.default.transports.Console({
    format: consoleFormat
});
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
        })
    ]
});
exports.securityLogger = winston_1.default.createLogger({
    level: 'info',
    transports: [
        securityFileTransport,
        consoleTransport
    ]
});
// Создаем middleware для логирования HTTP запросов
const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const message = {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.get('user-agent'),
            ip: req.ip
        };
        if (res.statusCode >= 400) {
            logger.error('HTTP Request Error', message);
        }
        else {
            logger.info('HTTP Request', message);
        }
    });
    next();
};
exports.requestLogger = requestLogger;
// Создаем функцию для логирования ошибок
const errorLogger = (err, req, res, next) => {
    logger.error('Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body,
        query: req.query,
        params: req.params
    });
    next();
};
exports.errorLogger = errorLogger;
// Создаем функцию для логирования событий безопасности
const logSecurityEvent = (event, data) => {
    exports.securityLogger.info(event, {
        timestamp: new Date().toISOString(),
        ...data
    });
};
exports.logSecurityEvent = logSecurityEvent;
exports.default = logger;
