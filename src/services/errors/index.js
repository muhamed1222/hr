"use strict";

const { info: _info, error: _error, warn: _warn, debug: _debug } = require("../../utils/logger");

// Константы для HTTP статусов
const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

/**
 * Базовый класс для кастомных ошибок приложения
 */
class AppError extends Error {
  constructor(
    message,
    statusCode = HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
    isOperational = true,
  ) {
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
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
  }
}

/**
 * Ошибка аутентификации
 */
class _AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthenticationError";
    this.statusCode = 401;
  }
}

/**
 * Ошибка авторизации (недостаточно прав)
 */
class _AuthorizationError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthorizationError";
    this.statusCode = 403;
  }
}

/**
 * Ошибка "не найдено"
 */
class NotFoundError extends AppError {
  constructor(message = "Ресурс не найден") {
    super(message, HTTP_STATUS_CODES.NOT_FOUND);
  }
}

/**
 * Ошибка конфликта (например, дублирование данных)
 */
class ConflictError extends AppError {
  constructor(message = "Конфликт данных") {
    super(message, HTTP_STATUS_CODES.CONFLICT);
  }
}

/**
 * Ошибка превышения лимитов (rate limiting)
 */
class RateLimitError extends AppError {
  constructor(message = "Превышен лимит запросов") {
    super(message, HTTP_STATUS_CODES.TOO_MANY_REQUESTS);
  }
}

/**
 * Ошибка внешнего сервиса
 */
class ExternalServiceError extends AppError {
  constructor(message = "Ошибка внешнего сервиса", service = null) {
    super(message, HTTP_STATUS_CODES.SERVICE_UNAVAILABLE);
    this.service = service;
  }
}

/**
 * Ошибка базы данных
 */
class DatabaseError extends AppError {
  constructor(message = "Ошибка базы данных", originalError = null) {
    super(message, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
    this.originalError = originalError;
  }
}

/**
 * Middleware для обработки ошибок
 */
const errorHandler = (error, req, res, _next) => {
  // Логируем ошибку
  _error(
    `[${new Date().toISOString()}] ${error.name}: ${error.message}`,
  );
  if (error.stack && process.env.NODE_ENV !== "production") {
    _error(error.stack);
  }

  // Явная обработка ошибок аутентификации и авторизации для тестов
  if (
    error instanceof _AuthenticationError ||
    error instanceof _AuthorizationError
  ) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  // Явная обработка ошибок смены пароля
  if (error.message && error.message.toLowerCase().includes("текущий пароль")) {
    return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
      success: false,
      message: "Неверный текущий пароль",
    });
  }

  // Операционные ошибки (ожидаемые)
  if (error.isOperational) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      ...(error.details && { details: error.details }),
      ...(error.service && { service: error.service }),
    });
  }

  // Ошибки валидации express-validator
  if (error.array && typeof error.array === "function") {
    return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: "Ошибка валидации данных",
      errors: error.array(),
    });
  }

  // Ошибки Sequelize
  if (error.name === "SequelizeValidationError") {
    return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: "Ошибка валидации данных",
      errors: error.errors.map((e) => ({ field: e.path, message: e.message })),
    });
  }

  if (error.name === "SequelizeUniqueConstraintError") {
    return res.status(HTTP_STATUS_CODES.CONFLICT).json({
      success: false,
      message: "Нарушение уникальности данных",
      fields: error.errors.map((e) => e.path),
    });
  }

  // Ошибки JWT
  if (error.name === "JsonWebTokenError") {
    return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
      success: false,
      message: "Недействительный токен",
    });
  }

  if (error.name === "TokenExpiredError") {
    return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
      success: false,
      message: "Токен истёк",
    });
  }

  // Системные ошибки (неожиданные)
  _error("Неожиданная ошибка:", error);

  return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Внутренняя ошибка сервера"
        : error.message,
    ...(process.env.NODE_ENV !== "production" && { stack: error.stack }),
  });
};

/**
 * Middleware для обработки HTTP_STATUS_CODES.NOT_FOUND ошибок
 */
const notFoundHandler = (req, res) => {
  res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
    success: false,
    message: `Маршрут ${req.method} ${req.path} не найден`,
    availableRoutes: [
      "GET /api/auth/verify",
      "POST /api/auth/login",
      "POST /api/auth/change-password",
    ],
  });
};

/**
 * Обертка для асинхронных функций
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  // Классы ошибок
  AppError,
  ValidationError,
  _AuthenticationError,
  _AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  DatabaseError,

  // Middleware
  errorHandler,
  notFoundHandler,
  asyncHandler,

  // Константы
  HTTP_STATUS_CODES,
};
