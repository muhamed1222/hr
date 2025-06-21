import { Request, Response, NextFunction } from 'express';
import { AppError } from '../services/errors/AppError';
import logger from '../config/logging';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      isOperational: err.isOperational,
    });
  }

  // Непредвиденная ошибка
  return res.status(500).json({
    message: 'Внутренняя ошибка сервера',
    isOperational: false,
  });
};

// Catch unhandled rejections and exceptions
process.on('unhandledRejection', (reason: Error) => {
  logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
}); 