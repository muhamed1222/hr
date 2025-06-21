import winston from 'winston';
import path from 'path';
import 'winston-daily-rotate-file';

const LOG_DIR = path.join(__dirname, '../../logs');
const MAX_SIZE = '20m';
const MAX_FILES = '14d';

const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    ({ level, message, timestamp, ...metadata }) => {
      let msg = `${timestamp} [${level}]: ${message}`;
      if (Object.keys(metadata).length > 0) {
        msg += '\n' + JSON.stringify(metadata, null, 2);
      }
      return msg;
    }
  )
);

const errorFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(LOG_DIR, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: MAX_SIZE,
  maxFiles: MAX_FILES,
  level: 'error',
  format: customFormat
});

const combinedFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(LOG_DIR, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: MAX_SIZE,
  maxFiles: MAX_FILES,
  format: customFormat
});

const securityFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(LOG_DIR, 'security-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: MAX_SIZE,
  maxFiles: MAX_FILES,
  format: customFormat
});

const consoleTransport = new winston.transports.Console({
  format: consoleFormat
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    errorFileTransport,
    combinedFileTransport,
    consoleTransport
  ]
});

export const securityLogger = winston.createLogger({
  level: 'info',
  transports: [
    securityFileTransport,
    consoleTransport
  ]
});

// Создаем middleware для логирования HTTP запросов
export const requestLogger = (req: any, res: any, next: () => void) => {
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
    } else {
      logger.info('HTTP Request', message);
    }
  });
  next();
};

// Создаем функцию для логирования ошибок
export const errorLogger = (err: Error, req: any, res: any, next: () => void) => {
  logger.error('Unhandled Error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body
  });
  next(err);
};

// Создаем функцию для логирования событий безопасности
export const logSecurityEvent = (event: string, data: Record<string, any>) => {
  securityLogger.info(event, {
    timestamp: new Date().toISOString(),
    ...data
  });
}; 