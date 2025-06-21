const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { TIME_CONSTANTS, LIMITS } = require('../constants');

// Базовые настройки безопасности
const securityConfig = {
  // CSP настройки
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://yastatic.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:", "https://yastatic.net"],
      imgSrc: ["'self'", "data:", "https:", "blob:", "https://yastatic.net"],
      connectSrc: ["'self'", "https://api.telegram.org", "http://localhost:*", "ws://localhost:*", "https://yastatic.net"],
      frameSrc: ["'self'", "https://t.me"],
      fontSrc: ["'self'", "data:", "https:", "https://yastatic.net"],
      upgradeInsecureRequests: []
    }
  },

  // Настройки CORS
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5177'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-XSRF-TOKEN'],
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
  app.use(helmet({
    ...securityConfig.contentSecurityPolicy,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));

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