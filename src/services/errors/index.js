/**
 * Базовый класс для кастомных ошибок приложения
 */
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Ошибка валидации данных
 */
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400);
    this.details = details;
  }
}

/**
 * Ошибка аутентификации
 */
class AuthenticationError extends AppError {
  constructor(message = 'Ошибка аутентификации') {
    super(message, 401);
  }
}

/**
 * Ошибка авторизации (недостаточно прав)
 */
class AuthorizationError extends AppError {
  constructor(message = 'Недостаточно прав доступа') {
    super(message, 403);
  }
}

/**
 * Ошибка "не найдено"
 */
class NotFoundError extends AppError {
  constructor(message = 'Ресурс не найден') {
    super(message, 404);
  }
}

/**
 * Ошибка конфликта (например, дублирование данных)
 */
class ConflictError extends AppError {
  constructor(message = 'Конфликт данных') {
    super(message, 409);
  }
}

/**
 * Ошибка превышения лимитов (rate limiting)
 */
class RateLimitError extends AppError {
  constructor(message = 'Превышен лимит запросов') {
    super(message, 429);
  }
}

/**
 * Ошибка внешнего сервиса
 */
class ExternalServiceError extends AppError {
  constructor(message = 'Ошибка внешнего сервиса', service = null) {
    super(message, 502);
    this.service = service;
  }
}

/**
 * Ошибка базы данных
 */
class DatabaseError extends AppError {
  constructor(message = 'Ошибка базы данных', originalError = null) {
    super(message, 500);
    this.originalError = originalError;
  }
}

/**
 * Middleware для обработки ошибок
 */
const errorHandler = (error, req, res, next) => {
  // Логируем ошибку
  console.error(`[${new Date().toISOString()}] ${error.name}: ${error.message}`);
  if (error.stack && process.env.NODE_ENV !== 'production') {
    console.error(error.stack);
  }

  // Операционные ошибки (ожидаемые)
  if (error.isOperational) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      ...(error.details && { details: error.details }),
      ...(error.service && { service: error.service })
    });
  }

  // Ошибки валидации express-validator
  if (error.array && typeof error.array === 'function') {
    return res.status(400).json({
      success: false,
      message: 'Ошибка валидации данных',
      errors: error.array()
    });
  }

  // Ошибки Sequelize
  if (error.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Ошибка валидации данных',
      errors: error.errors.map(e => ({ field: e.path, message: e.message }))
    });
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'Нарушение уникальности данных',
      fields: error.errors.map(e => e.path)
    });
  }

  // Ошибки JWT
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Недействительный токен'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Токен истёк'
    });
  }

  // Системные ошибки (неожиданные)
  console.error('Неожиданная ошибка:', error);
  
  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Внутренняя ошибка сервера' 
      : error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  });
};

/**
 * Middleware для обработки 404 ошибок
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Маршрут ${req.method} ${req.path} не найден`,
    availableRoutes: [
      'GET /api/auth/verify',
      'POST /api/auth/login',
      'POST /api/auth/change-password'
    ]
  });
};

/**
 * Утилита для асинхронной обработки ошибок в роутах
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  DatabaseError,
  errorHandler,
  notFoundHandler,
  asyncHandler
}; 