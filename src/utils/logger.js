"use strict";

const _winston = require("winston");
const _path = require("path");
const { _info, _error, _warn, _debug } = require("./logger");

// Создаем директорию для логов если её нет
const logsDir = path.join(__dirname, "../../logs");
const _fs = require("fs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Определяем уровень логирования на основе окружения
const level = process.env.NODE_ENV === "production" ? "info" : "debug";

// Создаем форматтер для консоли
const consoleFormat = _winston.format.combine(
  _winston.format.colorize(),
  _winston.format.timestamp({ format: "HH:mm:ss" }),
  _winston.format.printf(({ level, message, timestamp, service }) => {
    const serviceTag = service ? `[${service}]` : "";
    return `${timestamp} ${level} ${serviceTag}: ${message}`;
  }),
);

// Создаем форматтер для файлов
const fileFormat = _winston.format.combine(
  _winston.format.timestamp(),
  _winston.format.errors({ stack: true }),
  _winston.format.json(),
);

// Конфигурация транспортов
const transports = [
  // Логи в консоль (только для development)
  ...(process.env.NODE_ENV !== "production"
    ? [
        new _winston.transports.Console({
          level,
          format: consoleFormat,
        }),
      ]
    : []),

  // Общие логи
  new _winston.transports.File({
    filename: path.join(logsDir, "app.log"),
    level: "info",
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  // Логи ошибок
  new _winston.transports.File({
    filename: path.join(logsDir, "error.log"),
    level: "error",
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  // Логи аудита (критичные действия)
  new _winston.transports.File({
    filename: path.join(logsDir, "audit.log"),
    level: "warn",
    format: fileFormat,
    maxsize: 10485760, // 10MB
    maxFiles: 10,
  }),
];

// Создаем основной логгер
const logger = _winston.createLogger({
  level,
  format: fileFormat,
  transports,
  // Не выходим из процесса при ошибке логирования
  exitOnError: false,
});

// Создаем специализированные логгеры для разных сервисов
const createServiceLogger = (serviceName) => {
  return logger.child({ service: serviceName });
};

// Экспортируем функции-обертки для удобства
module.exports = {
  // Основной логгер
  logger,

  // Функция создания логгера для сервиса
  createServiceLogger,

  // Удобные функции для логирования
  info: (...args) => _info(...args),
  error: (...args) => _error(...args),
  warn: (...args) => _warn(...args),
  debug: (...args) => _debug(...args),

  // Специальные функции
  audit: (action, userId, details = {}) => {
    logger.warn("AUDIT", {
      action,
      userId,
      timestamp: new Date().toISOString(),
      ip: details.ip,
      userAgent: details.userAgent,
      ...details,
    });
  },

  security: (event, details = {}) => {
    logger.error("SECURITY", {
      event,
      timestamp: new Date().toISOString(),
      ...details,
    });
  },

  telegram: (action, details = {}) => {
    const telegramLogger = createServiceLogger("telegram");
    telegramLogger.info(action, details);
  },

  cron: (job, details = {}) => {
    const cronLogger = createServiceLogger("cron");
    cronLogger.info(job, details);
  },

  auth: (event, details = {}) => {
    const authLogger = createServiceLogger("auth");
    authLogger.info(event, details);
  },

  _info,
  _error,
  _warn,
  _debug,
};

// Обработка необработанных исключений и промисов
logger.exceptions.handle(
  new _winston.transports.File({
    filename: path.join(logsDir, "exceptions.log"),
  }),
);

logger.rejections.handle(
  new _winston.transports.File({
    filename: path.join(logsDir, "rejections.log"),
  }),
);
