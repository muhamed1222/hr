const Tokens = require('csrf');
const { error: _error } = require('../utils/logger');
const AppError = require('../services/errors/AppError');
const ErrorTypes = require('../services/errors/errorTypes');

const tokens = new Tokens();

// Список путей, которые не требуют CSRF защиты
const csrfExcludedPaths = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/telegram-webhook',
  '/health',
  '/api-docs',
  '/api/metrics'
];

// Проверка, нужна ли CSRF защита для данного пути
const shouldCheckCSRF = (path) => {
  return !csrfExcludedPaths.some(excludedPath => path.startsWith(excludedPath));
};

// Middleware для генерации CSRF токена
const generateToken = (req, res, next) => {
  if (!req.session.csrfSecret) {
    req.session.csrfSecret = tokens.secretSync();
  }
  
  // Генерируем токен на основе секрета
  const token = tokens.create(req.session.csrfSecret);
  
  // Добавляем токен в заголовки ответа
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false, // Доступен для JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  
  // Сохраняем токен в res.locals для использования в шаблонах
  res.locals.csrfToken = token;
  
  next();
};

// Middleware для проверки CSRF токена
const verifyToken = (req, res, next) => {
  // Пропускаем проверку для исключенных путей
  if (!shouldCheckCSRF(req.path)) {
    return next();
  }

  const secret = req.session.csrfSecret;
  const token = (req.body && req.body._csrf) ||
                (req.query && req.query._csrf) ||
                (req.headers['x-csrf-token']) ||
                (req.headers['x-xsrf-token']);

  if (!secret || !token) {
    _error('CSRF validation failed: missing token or secret', {
      path: req.path,
      method: req.method
    });
    return next(new AppError('CSRF validation failed', 403, ErrorTypes.SECURITY.CSRF_TOKEN_MISSING));
  }

  if (!tokens.verify(secret, token)) {
    _error('CSRF validation failed: invalid token', {
      path: req.path,
      method: req.method
    });
    return next(new AppError('CSRF validation failed', 403, ErrorTypes.SECURITY.CSRF_TOKEN_INVALID));
  }

  next();
};

module.exports = {
  generateToken,
  verifyToken
}; 