const { AppError } = require('./AppError');
const logger = require('../../config/logging');
const ErrorTypes = require('./errorTypes');

// Обработка ошибок разработки
const handleDevelopmentError = (err, res) => {
  logger.error('Development Error:', {
    message: err.message,
    stack: err.stack,
    errorCode: err.errorCode
  });

  return res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    errorCode: err.errorCode,
    stack: err.stack
  });
};

// Обработка ошибок продакшена
const handleProductionError = (err, res) => {
  logger.error('Production Error:', {
    message: err.message,
    errorCode: err.errorCode
  });

  // Операционные, доверенные ошибки
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      errorCode: err.errorCode
    });
  }
  
  // Программные ошибки
  return res.status(500).json({
    status: 'error',
    message: 'Что-то пошло не так',
    errorCode: ErrorTypes.GENERAL.INTERNAL_ERROR
  });
};

// Обработчик ошибок Sequelize
const handleSequelizeError = (err) => {
  if (err.name === 'SequelizeValidationError') {
    const message = err.errors.map(e => e.message).join('. ');
    return new AppError(message, 400, ErrorTypes.VALIDATION.INVALID_INPUT);
  }
  if (err.name === 'SequelizeUniqueConstraintError') {
    return new AppError('Запись уже существует', 400, ErrorTypes.DATABASE.DUPLICATE_ENTRY);
  }
  return new AppError('Ошибка базы данных', 500, ErrorTypes.DATABASE.QUERY_FAILED);
};

// Обработчик ошибок JWT
const handleJWTError = () => 
  new AppError('Неверный токен', 401, ErrorTypes.AUTH.TOKEN_INVALID);

const handleJWTExpiredError = () => 
  new AppError('Токен истек', 401, ErrorTypes.AUTH.TOKEN_EXPIRED);

// Главный обработчик ошибок
const errorHandler = (err, req, res, next) => {
  // Логируем ошибку
  const errorContext = {
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    body: req.body,
    query: req.query,
    params: req.params,
    stack: err.stack
  };

  if (err instanceof AppError) {
    // Для известных ошибок приложения
    logger.error(`${err.name}: ${err.message}`, errorContext);
    
    return res.status(err.statusCode).json({
      status: 'error',
      code: err.code,
      message: err.message
    });
  }

  // Для неизвестных ошибок
  logger.error('Неизвестная ошибка:', {
    ...errorContext,
    error: err.message || 'Внутренняя ошибка сервера'
  });

  // В продакшене не отправляем детали ошибки клиенту
  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({
      status: 'error',
      message: 'Внутренняя ошибка сервера'
    });
  }

  // В разработке отправляем полную информацию об ошибке
  return res.status(500).json({
    status: 'error',
    message: err.message || 'Внутренняя ошибка сервера',
    stack: err.stack
  });
};

module.exports = errorHandler; 