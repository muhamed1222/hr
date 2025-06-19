const winston = require('winston');
const path = require('path');

// Создаем директорию для логов если её нет
const logsDir = path.join(__dirname, '../../logs');
const fs = require('fs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Определяем уровень логирования на основе окружения
const level = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// Создаем форматтер для консоли
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, service }) => {
    const serviceTag = service ? `[${service}]` : '';
    return `${timestamp} ${level} ${serviceTag}: ${message}`;
  })
);

// Создаем форматтер для файлов
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Конфигурация транспортов
const transports = [
  // Логи в консоль (только для development)
  ...(process.env.NODE_ENV !== 'production' ? [
    new winston.transports.Console({
      level,
      format: consoleFormat
    })
  ] : []),

  // Общие логи
  new winston.transports.File({
    filename: path.join(logsDir, 'app.log'),
    level: 'info',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }),

  // Логи ошибок
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }),

  // Логи аудита (критичные действия)
  new winston.transports.File({
    filename: path.join(logsDir, 'audit.log'),
    level: 'warn',
    format: fileFormat,
    maxsize: 10485760, // 10MB
    maxFiles: 10
  })
];

// Создаем основной логгер
const logger = winston.createLogger({
  level,
  format: fileFormat,
  transports,
  // Не выходим из процесса при ошибке логирования
  exitOnError: false
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
  info: (message, meta = {}) => logger.info(message, meta),
  error: (message, meta = {}) => logger.error(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),
  
  // Специальные функции
  audit: (action, userId, details = {}) => {
    logger.warn('AUDIT', {
      action,
      userId,
      timestamp: new Date().toISOString(),
      ip: details.ip,
      userAgent: details.userAgent,
      ...details
    });
  },
  
  security: (event, details = {}) => {
    logger.error('SECURITY', {
      event,
      timestamp: new Date().toISOString(),
      ...details
    });
  },
  
  telegram: (action, details = {}) => {
    const telegramLogger = createServiceLogger('telegram');
    telegramLogger.info(action, details);
  },
  
  cron: (job, details = {}) => {
    const cronLogger = createServiceLogger('cron');
    cronLogger.info(job, details);
  },
  
  auth: (event, details = {}) => {
    const authLogger = createServiceLogger('auth');
    authLogger.info(event, details);
  }
};

// Обработка необработанных исключений и промисов
logger.exceptions.handle(
  new winston.transports.File({ 
    filename: path.join(logsDir, 'exceptions.log') 
  })
);

logger.rejections.handle(
  new winston.transports.File({ 
    filename: path.join(logsDir, 'rejections.log') 
  })
); 