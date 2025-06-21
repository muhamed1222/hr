"use strict";

const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");
const fs = require("fs");
const { TIME_CONSTANTS } = require("../constants");

// Создание директории для логов
const logDir = path.join(process.cwd(), "logs");

// Константы для конфигурации логов
const LOG_RETENTION_DAYS = 14;
const LOG_CLEANUP_DAYS = 30;
const LOG_MAX_SIZE = "20m";

// Конфигурация ротации логов
const logRotationConfig = {
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: LOG_MAX_SIZE,
  maxFiles: `${LOG_RETENTION_DAYS}d`, // Хранить логи за 14 дней
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
};

// Создание логгера
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "hr-system" },
  transports: [
    // Ротация файлов для всех логов
    new DailyRotateFile({
      filename: path.join(logDir, "application-%DATE%.log"),
      ...logRotationConfig,
    }),

    // Ротация файлов для ошибок
    new DailyRotateFile({
      filename: path.join(logDir, "error-%DATE%.log"),
      level: "error",
      ...logRotationConfig,
    }),

    // Ротация файлов для аудита
    new DailyRotateFile({
      filename: path.join(logDir, "audit-%DATE%.log"),
      level: "info",
      ...logRotationConfig,
    }),
  ],
});

// Добавление консольного вывода в режиме разработки
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  );
}

// Функция для очистки старых логов
function cleanupOldLogs() {
  const logFiles = fs.readdirSync(logDir);
  const now = new Date();
  const maxAge = LOG_CLEANUP_DAYS * TIME_CONSTANTS.DAY; // 30 дней в миллисекундах

  logFiles.forEach((file) => {
    const filePath = path.join(logDir, file);
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
  const logFiles = fs.readdirSync(logDir);

  const stats = {
    totalFiles: logFiles.length,
    totalSize: 0,
    filesByType: {},
  };

  logFiles.forEach((file) => {
    const filePath = path.join(logDir, file);
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
  logDir,
};
