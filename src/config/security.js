const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { TIME_CONSTANTS, LIMITS } = require('../constants');

// Базовые настройки безопасности
const securityConfig = {
  // CSP настройки
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.telegram.org"],
      frameSrc: ["'self'", "https://t.me"],
      upgradeInsecureRequests: []
    }
  },

  // Настройки CORS
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    maxAge: 600
  },

  // Rate limiting
  rateLimiting: {
    window: 15 * TIME_CONSTANTS.MINUTE,
    max: process.env.NODE_ENV === 'production' ? 100 : 1000
  },

  // Настройки cookie
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
};

// Middleware конфигурации
const configureSecurityMiddleware = (app) => {
  // Helmet middleware
  app.use(helmet(securityConfig.contentSecurityPolicy));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: securityConfig.rateLimiting.window,
    max: securityConfig.rateLimiting.max,
    message: {
      status: 'error',
      message: 'Слишком много запросов. Попробуйте позже.',
      errorCode: 'ERR_RATE_LIMIT'
    }
  });

  // Применяем rate limiting к API маршрутам
  app.use('/api/', limiter);

  // Особые настройки rate limiting для критических эндпоинтов
  const strictLimiter = rateLimit({
    windowMs: 15 * TIME_CONSTANTS.MINUTE,
    max: process.env.NODE_ENV === 'production' ? 5 : LIMITS.DEFAULT_PAGE_SIZE,
    message: {
      status: 'error',
      message: 'Слишком много попыток. Попробуйте через 15 минут.',
      errorCode: 'ERR_STRICT_RATE_LIMIT'
    }
  });

  // Применяем строгий rate limiting к критическим эндпоинтам
  app.use('/api/auth/login', strictLimiter);
  app.use('/api/auth/reset-password', strictLimiter);
};

module.exports = {
  securityConfig,
  configureSecurityMiddleware
}; 