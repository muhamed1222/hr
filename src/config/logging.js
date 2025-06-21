"use strict";

const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");
const fs = require("fs");
const { TIME_CONSTANTS } = require("../constants");

// Создаем директорию для логов, если она не существует
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Определяем форматы для разных типов логов
const formats = {
  console: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} ${level}: ${message}`;
    })
  ),
  file: winston.format.combine(
    winston.format.timestamp(),
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

// Создаем логгер
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: formats.console,
      level: 'info'
    }),
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      level: 'error',
      ...rotateConfig
    }),
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      ...rotateConfig
    })
  ]
});

// Функция для очистки старых логов
function cleanupOldLogs() {
  const logFiles = fs.readdirSync(logDir);
  const now = new Date();
  const maxAge = LOG_CLEANUP_DAYS * TIME_CONSTANTS.DAY;

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
