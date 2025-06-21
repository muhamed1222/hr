"use strict";

const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");
const fs = require("fs");
const { TIME_CONSTANTS } = require("../constants");

// Форматы логов
const formats = {
  console: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : "";
      return `${timestamp} ${level}: ${message} ${metaStr}`;
    })
  ),
  
  file: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.json()
  )
};

// Константы для конфигурации логов
const LOG_RETENTION_DAYS = 14;
const LOG_CLEANUP_DAYS = 30;
const LOG_MAX_SIZE = "20m";

// Конфигурация ротации файлов
const rotateConfig = {
  datePattern: "YYYY-MM-DD",
  maxSize: LOG_MAX_SIZE,
  maxFiles: `${LOG_RETENTION_DAYS}d`,
  compress: true
};

// Создаем директорию для логов если её нет
const logsDir = path.join(process.cwd(), "logs");
if (!require("fs").existsSync(logsDir)) {
  require("fs").mkdirSync(logsDir);
}

// Транспорты для разных уровней логирования
const transports = {
  error: new DailyRotateFile({
    level: "error",
    filename: path.join(logsDir, "error-%DATE%.log"),
    format: formats.file,
    ...rotateConfig
  }),

  combined: new DailyRotateFile({
    filename: path.join(logsDir, "combined-%DATE%.log"),
    format: formats.file,
    ...rotateConfig
  }),

  security: new DailyRotateFile({
    filename: path.join(logsDir, "security-%DATE%.log"),
    format: formats.file,
    ...rotateConfig
  }),

  console: new winston.transports.Console({
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    format: formats.console
  })
};

// Создаем логгеры для разных контекстов
const loggers = {
  // Основной логгер
  default: winston.createLogger({
    levels: winston.config.npm.levels,
    transports: [
      transports.error,
      transports.combined,
      transports.console
    ]
  }),

  // Логгер для безопасности
  security: winston.createLogger({
    levels: winston.config.npm.levels,
    transports: [
      transports.security,
      transports.console
    ]
  }),

  // Логгер для API
  api: winston.createLogger({
    levels: winston.config.npm.levels,
    transports: [
      transports.error,
      transports.combined,
      transports.console
    ]
  })
};

// Функции логирования
const logger = {
  error: (message, meta = {}) => {
    loggers.default.error(message, meta);
  },

  warn: (message, meta = {}) => {
    loggers.default.warn(message, meta);
  },

  info: (message, meta = {}) => {
    loggers.default.info(message, meta);
  },

  debug: (message, meta = {}) => {
    loggers.default.debug(message, meta);
  },

  // Логирование безопасности
  security: {
    error: (message, meta = {}) => {
      loggers.security.error(message, meta);
    },
    warn: (message, meta = {}) => {
      loggers.security.warn(message, meta);
    },
    info: (message, meta = {}) => {
      loggers.security.info(message, meta);
    },
    audit: (message, meta = {}) => {
      loggers.security.info("AUDIT: " + message, meta);
    }
  },

  // Логирование API
  api: {
    error: (message, meta = {}) => {
      loggers.api.error(message, meta);
    },
    warn: (message, meta = {}) => {
      loggers.api.warn(message, meta);
    },
    info: (message, meta = {}) => {
      loggers.api.info(message, meta);
    },
    request: (req, meta = {}) => {
      loggers.api.info(`${req.method} ${req.originalUrl}`, {
        ...meta,
        ip: req.ip,
        userId: req.user?.id,
        userAgent: req.headers["user-agent"]
      });
    },
    response: (req, res, meta = {}) => {
      loggers.api.info(`${req.method} ${req.originalUrl} - ${res.statusCode}`, {
        ...meta,
        responseTime: meta.responseTime,
        userId: req.user?.id
      });
    }
  }
};

// Функция для очистки старых логов
function cleanupOldLogs() {
  const logFiles = fs.readdirSync(logsDir);
  const now = new Date();
  const maxAge = LOG_CLEANUP_DAYS * TIME_CONSTANTS.DAY; // 30 дней в миллисекундах

  logFiles.forEach((file) => {
    const filePath = path.join(logsDir, file);
    const stats = fs.statSync(filePath);
    const fileAge = now.getTime() - stats.mtime.getTime();

    if (fileAge > maxAge) {
      fs.unlinkSync(filePath);
      logger.info(`Удален старый лог файл: ${file}`);
    }
  });
}

// Функция для получения статистики логов
function getLogStats() {
  const logFiles = fs.readdirSync(logsDir);

  const stats = {
    totalFiles: logFiles.length,
    totalSize: 0,
    filesByType: {},
  };

  logFiles.forEach((file) => {
    const filePath = path.join(logsDir, file);
    const fileStats = fs.statSync(filePath);
    stats.totalSize += fileStats.size;

    const fileType = file.split("-")[0];
    if (!stats.filesByType[fileType]) {
      stats.filesByType[fileType] = { count: 0, size: 0 };
    }
    stats.filesByType[fileType].count++;
    stats.filesByType[fileType].size += fileStats.size;
  });

  return stats;
}

// Экспорт функций
module.exports = {
  logger,
  cleanupOldLogs,
  getLogStats,
  logsDir,
};
